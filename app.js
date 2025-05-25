import express from 'express';
import 'dotenv/config';
import { testConnection } from './config/db.js';
import authRoutes from './routes/authRoutes.js';

// Initialize Express app
const app = express();

// Test database connection on startup
const initializeApp = async () => {
  try {
    await testConnection();
    console.log('✅ Server connected to Supabase');
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    process.exit(1);
  }
};

// Initialize the app
initializeApp();

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

export default app;
