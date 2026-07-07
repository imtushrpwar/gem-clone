import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContextInstance';

export default function Login() {
  const { setToken } = useContext(AuthContext);
  
  // View Modes: 'login', 'register', 'forgot'
  const [viewMode, setViewMode] = useState('login'); 
  const [otpSent, setOtpSent] = useState(false); // Flags transitioning to the 6-digit view entry row

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP Reset Pipeline States
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. SIGN UP PASSWORD MATCH CHECK
    if (viewMode === 'register' && password !== confirmPassword) {
      alert('❌ Passwords do not match. Please verify your typing.');
      return;
    }

    // 2. FORGOT PASSWORD PIPELINE (PHASE 1: REQUEST OTP)
    if (viewMode === 'forgot' && !otpSent) {
      try {
        const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
          alert('✅ OTP Sent! Check your Email inbox.');
          setOtpSent(true); // Unlock validation field view options
        } else {
          alert(data.msg || 'Error processing request');
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // 3. FORGOT PASSWORD PIPELINE (PHASE 2: VERIFY AND RESET)
    if (viewMode === 'forgot' && otpSent) {
      if (otpCode.length !== 6) {
        alert('❌ OTP code must be exactly 6 digits.');
        return;
      }
      try {
        const res = await fetch('http://localhost:5000/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp: otpCode, newPassword })
        });
        const data = await res.json();
        if (res.ok) {
          alert('🎉 Password reset successful! Redirecting to Login view.');
          // Reset states and loop back to the login card view frame
          setViewMode('login');
          setOtpSent(false);
          setOtpCode('');
          setNewPassword('');
        } else {
          alert(data.msg || 'Verification failed');
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // 4. TRADITIONAL LOGIN/REGISTER PIPELINE
    try {
      const res = await fetch(`http://localhost:5000/api/auth/${viewMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
      } else {
        alert(data.msg || 'Authentication failure');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const switchMode = (mode) => {
    setViewMode(mode);
    setOtpSent(false);
    setConfirmPassword('');
    setOtpCode('');
  };

  return (
    <div className="auth-wrapper">
      <form onSubmit={handleSubmit} className="auth-card">
        
        {/* Dynamic Headers */}
        <h2>
          {viewMode === 'login' && 'Sign in to GemClone'}
          {viewMode === 'register' && 'Create GemClone Account'}
          {viewMode === 'forgot' && (otpSent ? 'Verify OTP Code' : 'Reset Password')}
        </h2>
        
        {/* Email Field - Hidden only during actual OTP numeric entry phase */}
        {(!otpSent || viewMode !== 'forgot') && (
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
        )}
        
        {/* Standard Login/Register Passwords */}
        {viewMode !== 'forgot' && (
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
        )}

        {/* Confirm Register Password box */}
        {viewMode === 'register' && (
          <input 
            type="password" 
            placeholder="Confirm Password" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            required 
          />
        )}

        {/* ================= OTP VERIFICATION BLOCKS ================= */}
        {viewMode === 'forgot' && otpSent && (
          <>
            <input 
              type="text" 
              maxLength="6"
              placeholder="Enter 6-Digit OTP" 
              value={otpCode} 
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} // Strips out letters natively
              required 
              style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: 'bold' }}
            />
            <input 
              type="password" 
              placeholder="Choose New Password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              required 
            />
          </>
        )}

        {/* Submit Buttons */}
        <button type="submit">
          {viewMode === 'login' && 'Login'}
          {viewMode === 'register' && 'Register'}
          {viewMode === 'forgot' && (otpSent ? 'Verify & Change Password' : 'Send Reset OTP')}
        </button>
        
        {/* Navigation Switch Triggers */}
        <div className="auth-links" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px', fontSize: '14px', cursor: 'pointer' }}>
          {viewMode === 'login' && (
            <>
              <p onClick={() => switchMode('register')}>Don't have an account? <span style={{ color: '#004cca' }}>Sign Up</span></p>
              <p onClick={() => switchMode('forgot')} style={{ color: '#ff6b6b' }}>Forgot Password?</p>
            </>
          )}

          {viewMode === 'register' && (
            <p onClick={() => switchMode('login')}>Already have an account? <span style={{ color: '#004cca' }}>Sign In</span></p>
          )}

          {viewMode === 'forgot' && (
            <p onClick={() => switchMode('login')}>← Back to <span style={{ color: '#004cca' }}>Sign In</span></p>
          )}
        </div>
      </form>
    </div>
  );
}