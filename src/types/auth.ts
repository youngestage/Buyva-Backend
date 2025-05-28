import { Request } from 'express';
import { UserProfile } from './user.js';

export interface SignupRequest extends Request {
  body: {
    email: string;
    password: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    role?: 'customer' | 'vendor' | 'admin';
    [key: string]: any; // Allow additional properties
  };
  [key: string]: any; // Allow other properties
}

export interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
  [key: string]: any; // Allow other properties
}

export interface UpdateProfileRequest extends Request {
  user?: UserProfile;
  body: Partial<{
    full_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    [key: string]: any; // Allow additional properties
  }>;
  [key: string]: any; // Allow other properties
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: UserProfile;
  session?: any; // You might want to define a more specific type for session
  error?: string;
}
