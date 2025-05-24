const express = require('express');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware for parsing JSON bodies
app.use(express.json());

// Mount authentication routes
app.use('/api/auth', authRoutes);

module.exports = app;
