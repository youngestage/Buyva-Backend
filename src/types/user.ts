export type UserRole = 'customer' | 'vendor' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string; // Add full_name to match the response in authController
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  // Add other user fields as needed
}

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: UserProfile;
  token?: string;
  [key: string]: any; // Allow other properties
}
