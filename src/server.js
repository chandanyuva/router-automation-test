require('dotenv').config(); // Load variables from .env

const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');

// This require will trigger the database initialization
const db = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173', // Replace with your frontend's actual URL/port
  credentials: true // Crucial for sending/receiving HttpOnly cookies
}));

// Middleware
app.use(express.json()); // To parse JSON bodies
app.use(cookieParser()); // To parse cookies (for our JWT)


// A simple test route
app.get('/api/health', (req, res) => {
  logger.info('Health check endpoint hit');
  res.json({ status: 'ok', message: 'Router Automation API is running' });
});

app.use('/api/auth', authRoutes);

// Start the server
app.listen(PORT, () => {
  logger.info(`Server is starting...`);
  logger.info(`Server is running on http://localhost:${PORT}`);
});
