import { UserProfile } from './user.ts';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
      token?: string;
    }
  }
}

export {};
