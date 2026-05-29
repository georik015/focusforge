import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../types';

// Read at call time so dotenv has a chance to populate process.env
const getSecret = () => process.env.JWT_SECRET || (() => {
  console.warn('⚠️  JWT_SECRET not set — using insecure fallback. Set JWT_SECRET in .env!');
  return 'vanguard-dev-secret-2026';
})();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized access' });

  jwt.verify(token, getSecret(), (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Session expired' });
    req.user = user;
    next();
  });
};

export const authorize = (roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied: Insufficient privileges' });
    }
    next();
  };
};
