import express, { Express, Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import dotenv from 'dotenv';
import { StatusCodes } from 'http-status-codes';
import { testConnection } from './config/db.js';
import authRoutes from './routes/authRoutes.js';

// Initialize Express app
const app: Express = express();

// Test database connection on startup
const initializeApp = async (): Promise<void> => {
  try {
    await testConnection();
    console.log('✅ Server connected to Supabase');
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    process.exit(1);
  }
};

// Initialize the app
initializeApp().catch((error) => {
  console.error('❌ Failed to initialize app:', error);
  process.exit(1);
});

// Middleware
app.use(express.json());

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err.stack);
  
  // Handle different types of errors
  if (err.name === 'ValidationError') {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: 'error',
      message: 'Validation Error',
      errors: process.env.NODE_ENV === 'development' ? err.errors : undefined
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      status: 'error',
      message: 'Unauthorized',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Default error response
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
};

app.use(errorHandler);

// Handle 404 - Must be after all other routes
const notFoundHandler: RequestHandler = (req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    status: 'error',
    message: 'Not Found',
    path: req.originalUrl
  });
};

app.use(notFoundHandler);

export default app;
