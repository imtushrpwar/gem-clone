const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
connectDB();

app.use(cors({
  origin: 'http://localhost:5173', // 👈 Put your exact Frontend URL location here
  credentials: true // 👈 Allows cookies to safely bridge cross-origin environments
}));

app.use(express.json());
app.use(cookieParser());


app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));