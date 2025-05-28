import { Request } from 'express';
import { UserProfile } from './user.js';

export interface UpdateProfileRequest extends Request {
  user?: UserProfile;
  body: {
    first_name?: string;
    last_name?: string;
    name?: string; // For backward compatibility
    avatar_url?: string;
    [key: string]: any; // Allow other properties
  };
  [key: string]: any; // Allow other properties
}

export interface UpdateRoleRequest extends Request<{ id: string }> {
  body: {
    role: string;
    [key: string]: any;
  };
  user?: UserProfile;
  [key: string]: any; // Allow other properties
}

export interface GetUserRequest extends Request<{ id: string }> {
  user?: UserProfile;
  [key: string]: any; // Allow other properties
}

export interface DeleteUserRequest extends GetUserRequest {
  [key: string]: any; // Allow other properties
}

export interface UserResponse {
  success: boolean;
  message?: string;
  user?: UserProfile;
  users?: UserProfile[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
}
