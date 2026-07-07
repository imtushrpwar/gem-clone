# 🚀 GemClone — Multimodal AI Platform

GemClone is a production-grade full-stack AI chat application inspired by Google Gemini. It supports real-time streaming responses, multimodal conversations (text + images), secure authentication, Redis-powered caching, and an enterprise-level architecture designed for scalability and performance.

## ✨ Features

- 🤖 AI-powered chat using Google Gemini API
- ⚡ Real-time token-by-token streaming with Server-Sent Events (SSE)
- 🖼️ Multimodal conversations (Text + Image)
- 📝 Markdown rendering with syntax-highlighted code blocks
- 🔐 Dual Token Authentication (JWT Access + Refresh Tokens)
- 🍪 HTTP-Only Refresh Cookies for enhanced security
- 📧 Secure 6-digit Email OTP password recovery
- 🚀 Redis Cache-Aside architecture for faster chat retrieval
- 💾 MongoDB for persistent conversation storage
- 📱 Fully responsive modern UI
- 🔒 XSS-resistant authentication flow
- 📂 Image upload using Multer in-memory storage
- 🌙 Clean chat interface inspired by Gemini AI

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
- Multer
- Google Gemini API

---

## 🛠️ System Architecture

```
React Client
      │
      ▼
Express.js API
      │
 ┌────┴────┐
 │         │
 ▼         ▼
Redis   MongoDB
(Cache) (Chats & Users)
      │
      ▼
Google Gemini API
```

---

## 🔐 Authentication

- User Registration
- Secure Login
- JWT Access Tokens
- HTTP-Only Refresh Cookies
- Automatic Token Refresh
- Logout
- Forgot Password
- Email OTP Verification
- Reset Password

---

## ⚡ Performance Optimizations

- Redis Cache-Aside Pattern
- Server-Sent Events (SSE)
- In-memory Image Processing
- Reduced MongoDB Reads
- Low-latency Chat Retrieval
- Efficient Token Streaming

---

## 🤖 AI Features

- Real-time AI Streaming
- Multimodal Prompts
- Markdown Responses
- Syntax Highlighting
- Persistent Chat History
- Context-aware Conversations

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

### Clone Repository

```bash
git clone https://github.com/yourusername/gemclone.git
cd gemclone
```

### Backend

```bash
cd server
npm install
```

### Frontend

```bash
cd ../client
npm install
```

---

## ⚙️ Environment Variables

### Backend (.env)

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

### Backend

```bash
cd server
npm run dev
```

### Frontend

```bash
cd client
npm start
```

---

## 📸 Key Highlights

- Production-grade architecture
- Enterprise authentication model
- Redis-powered performance optimization
- Secure OTP verification workflow
- Real-time AI token streaming
- Multimodal AI interactions
- Responsive modern UI
- Clean and scalable codebase

---

⭐ If you like this project, don't forget to give it a star!