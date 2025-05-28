export type UserRole = 'customer' | 'vendor' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
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
