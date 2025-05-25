require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { StatusCodes } = require('http-status-codes');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Import Supabase client
const supabase = require('./config/supabase');


// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*', // Update with your frontend URL
  credentials: true
}));
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Debug route registration function (kept for reference)
const debugRoute = (method, path, handler) => {
  console.log(`Registering route: ${method.toUpperCase()} ${path}`);
  try {
    if (method === 'get') {
      app.get(path, handler);
    } else if (method === 'post') {
      app.post(path, handler);
    } else if (method === 'put') {
      app.put(path, handler);
    } else if (method === 'delete') {
      app.delete(path, handler);
    }
  } catch (error) {
    console.error(`Error registering route ${method.toUpperCase()} ${path}:`, error);
    throw error;
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.status(StatusCodes.OK).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
console.log('Mounting auth routes...');
app.use('/api/auth', authRoutes);

console.log('Mounting user routes...');
app.use('/api/users', userRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({ 
    status: 'error',
    message: 'API endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      status: 'error',
      message: 'Invalid token',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: 'error',
      message: 'Validation error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Default error handler
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Test Supabase connection on startup
const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Simple query to test the connection
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Successfully connected to Supabase');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.details) {
      console.error('Error details:', error.details);
    }
    
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    
    console.error('\nPlease check your Supabase configuration and ensure the database is properly set up.');
    console.error('Make sure your SUPABASE_URL and SUPABASE_ANON_KEY are correctly set in your .env file.');
    
    // Don't exit the process, just log the error and continue
    // This allows the server to start even if Supabase connection fails
    console.warn('\n⚠️  Continuing with limited functionality due to Supabase connection issues');
    return false;
  }
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  
  // Test database connection in the background
  testSupabaseConnection().then(success => {
    if (success) {
      console.log('✅ Database connection test completed successfully');
    } else {
      console.warn('⚠️  Database connection test completed with warnings');
    }
  }).catch(err => {
    console.error('❌ Database connection test failed:', err);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Export app and server for testing
module.exports = {
  app,
  server,
  testSupabaseConnection
};
