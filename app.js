const express = require('express');
const dotenv = require('dotenv'); // Import dotenv
const connectDB = require('./config/db'); // Import connectDB

dotenv.config(); // Load environment variables

connectDB(); // Connect to the database

const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware for parsing JSON bodies
app.use(express.json());

// Mount authentication routes
app.post('/api/auth/signup', (req, res) => {
    res.send('Test signup route reached!');
  });


module.exports = app;
