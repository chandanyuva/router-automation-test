require('dotenv').config(); // Load variables from .env

const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');


// This require will trigger the database initialization
const db = require('./db/init');

const app = express();

const PORT = process.env.PORT || 3000;


// Middleware
app.use(express.json()); // To parse JSON bodies
app.use(cookieParser()); // To parse cookies (for our JWT)


// A simple test route
app.get('/api/health', (req, res) => {
  logger.info('Health check endpoint hit');
  res.json({ status: 'ok', message: 'Router Automation API is running' });
});


// Start the server
app.listen(PORT, () => {
  logger.info(`Server is starting...`);
  logger.info(`Server is running on http://localhost:${PORT}`);
});
