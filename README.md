# 🚀 GemClone — Real-Time AI Chat Application

GemClone is a production-grade full-stack AI chat application inspired by Google Gemini. It delivers real-time streaming AI responses with a secure authentication system, Redis-powered caching, persistent chat history, and a modern responsive interface. The application is designed with scalable backend architecture and performance optimizations suitable for production environments.

## ✨ Features

- 🤖 AI-powered conversations using Google Gemini API
- ⚡ Real-time token-by-token streaming with Server-Sent Events (SSE)
- 📝 Markdown rendering with syntax-highlighted code blocks
- 💬 Persistent conversation history
- 🔐 Dual Token Authentication (JWT Access + Refresh Tokens)
- 🍪 HTTP-Only Refresh Cookies for enhanced security
- 📧 6-digit Email OTP password recovery
- 🚀 Redis Cache-Aside caching for faster chat retrieval
- 💾 MongoDB for user and chat data storage

---

## 🏗️ Tech Stack

### Frontend
- React.js
- JavaScript
- CSS
- React Router
- Axios

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Redis
- JWT Authentication
- Nodemailer
- Google Gemini API

---

## ⚡ Performance Optimizations

- Redis Cache-Aside Pattern
- Server-Sent Events (SSE)
- Reduced MongoDB database reads
- Low-latency chat retrieval
- Efficient token streaming

---

## 🔐 Authentication

- User Registration
- Secure Login
- JWT Access Tokens
- HTTP-Only Refresh Cookies
- Automatic Token Refresh
- Forgot Password
- Email OTP Verification
- Password Reset

---

## 🤖 AI Features

- Real-time AI response streaming
- Markdown-formatted responses
- Syntax-highlighted code blocks
- Persistent chat history
- Context-aware conversations

---

## 📂 Project Structure

```
GemClone
│
├── client
│   ├── src
│   ├── components
│   ├── pages
│   └── services
│
├── server
│   ├── controllers
│   ├── middleware
│   ├── routes
│   ├── models
│   ├── utils
│   └── config
│
└── README.md
```

---

## 🚀 Installation

```bash
git clone https://github.com/yourusername/gemclone.git
cd gemclone

# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

---

## ⚙️ Environment Variables

```env
PORT=5000
MONGODB_URI=your_mongodb_uri

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

REDIS_URL=your_redis_url

GEMINI_API_KEY=your_google_gemini_api_key

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

CLIENT_URL=http://localhost:3000
```

---

## ▶️ Run Project

```bash
# Backend
cd server
npm run dev

# Frontend
cd client
npm start
```

---

## 🌟 Key Highlights

- Production-ready MERN architecture
- Real-time AI token streaming
- Enterprise-grade JWT authentication
- Secure Email OTP workflow
- Redis-powered caching layer
- Persistent chat history
- Scalable backend design

---

⭐ If you found this project helpful, consider giving it a star!
