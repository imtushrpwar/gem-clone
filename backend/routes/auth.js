const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 1. Configure the email transport engine
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use true for port 465, false for port 587
  auth: {
     user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
});

// Helper configurations for token expiration windows
const ACCESS_TOKEN_EXPIRY = '15m'; // Short life
const REFRESH_TOKEN_EXPIRY = '7d';  // Long life

// Helper function to establish an HTTP-Only secure cookie configuration
const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true, // Prevents JavaScript reading access (Blocks XSS)
    secure: false, // Only sends over HTTPS in production
    sameSite: 'lax', // Blocks Cross-Site Request Forgery (CSRF)
    maxAge: 7 * 24 * 60 * 60 * 1000 // Match 7 days timeline in milliseconds
  });
};

// 1. REGISTER ROUTE
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Create Short-term Access Token and Long-term Refresh Token
    const accessToken = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    user.refreshToken = refreshToken; // Commit whitelist to DB
    await user.save();

    setRefreshCookie(res, refreshToken);
    res.json({ token: accessToken }); // Only return short-term access token to frontend memory
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// 2. LOGIN ROUTE
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const accessToken = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);
    res.json({ token: accessToken });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// 3. REFRESH TOKEN ROTATION ROUTE (The core magic)
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken; // Extract from HTTP-only cookie automatically

  if (!refreshToken) {
    return res.status(401).json({ msg: 'No refresh token, authorization denied' });
  }

  try {
    // Verify token validity
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Cross-check token validation against active database record
    const user = await User.findById(decoded.user.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ msg: 'Token is invalid or compromised' });
    }

    // Issue a clean new Access Token
    const newAccessToken = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    
    res.json({ token: newAccessToken });
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
});

// 4. LOGOUT ROUTE (Clears DB and drops Cookie)
router.post('/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = ''; // Wipe out of DB
      await user.save();
    }
    res.clearCookie('refreshToken'); // Expire browser cookie instantly
    res.json({ msg: 'Logged out successfully' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Get currently logged-in user details
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/forgot-password (REAL EMAIL DELIVERY)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'No account found with that email address.' });
    }

    // Generate a secure 6-digit numeric OTP code string
    const otp = crypto.randomInt(100000, 999999).toString();

    // Save OTP tracking fields to user schema
    user.resetPasswordToken = otp; 
    user.resetPasswordExpires = Date.now() + 5 * 60 * 1000; // 5 minute window
    await user.save();

    // 2. 👈 DEFINE THE EMAIL DESIGN AND ATTRIBUTES
    const mailOptions = {
      from: `"GemClone Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your GemClone Verification Code',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #131314; color: #fff; border-radius: 12px; max-width: 500px;">
          <h2 style="color: #00bcd4;">GemClone Password Reset</h2>
          <p>We received a request to reset your password. Use the verification code below to complete the process. This code expires in 5 minutes:</p>
          <div style="background-color: #1e1f20; padding: 15px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #00bcd4; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #80868b; font-size: 12px;">If you did not request this change, you can safely ignore this message.</p>
        </div>
      `
    };

    // 3. 👈 TRANSMIT THE EMAIL ALONG THE NETWORK PIPE
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL DISPATCHED] Verification code safely sent to: ${email}`);

    res.json({ msg: 'Verification OTP has been sent directly to your email inbox.' });
  } catch (err) {
    console.error("Mail service error:", err.message);
    res.status(500).send('Server error delivering email.');
  }
});

// @route   POST api/auth/reset-password (ALIGNMENT FIX)
router.post('/reset-password', async (req, res) => {
  // Catch variations of email, otp, and password keys defensively
  const email = (req.body.email || '').trim();
  const otp = (req.body.otp || req.body.otpCode || '').trim();
  const newPassword = req.body.newPassword || req.body.password;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ msg: 'Missing required validation fields. Ensure Email, OTP, and Password are provided.' });
  }

  try {
    // 1. Look up the user matching the exact string code
    const user = await User.findOne({
      email: email,
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() } // Double check expiration window
    });

    if (!user) {
      console.log(`[AUTH FAILED] OTP mismatch or expired for email: ${email}`);
      return res.status(400).json({ msg: 'Invalid or expired verification OTP code.' });
    }

    // 2. Hash the replacement password safely
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // 3. Atomically overwrite credentials directly in MongoDB
    await User.findOneAndUpdate(
      { _id: user._id },
      { 
        $set: { 
          password: hashedNewPassword,
          resetPasswordToken: '',       // Wipe OTP track string
          resetPasswordExpires: null     // Clear timer track
        }
      }
    );

    console.log(`[AUTH SUCCESS] Password successfully changed in database for user: ${email}`);
    res.json({ msg: 'Password reset successfully! You can now sign in with your new credentials.' });
  } catch (err) {
    console.error("Critical error in reset password execution:", err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;