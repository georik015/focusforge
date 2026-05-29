import { Router } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from './auth';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();
const getSecret = () => process.env.JWT_SECRET || 'vanguard-dev-secret-2026';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Identity validation failed or account dormant' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credential mismatch' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getSecret(),
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Неверный формат email или пароля' });
    }
    res.status(500).json({ error: 'Auth service internal error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: any, res) => {
  res.json(req.user);
});

// Admin creates invite token
router.post('/invite', authenticate, authorize(['ADMIN']), async (req: any, res) => {
  const { role } = req.body;
  const allowedRoles = ['ADMIN', 'SELLER', 'STOREKEEPER'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const token = crypto.randomBytes(20).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    const invite = await prisma.inviteToken.create({
      data: { token, role, createdBy: req.user.id, expiresAt }
    });

    res.json({ token: invite.token, role: invite.role, expiresAt: invite.expiresAt });
  } catch {
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// List active invites (admin only)
router.get('/invites', authenticate, authorize(['ADMIN']), async (_req, res) => {
  try {
    const invites = await prisma.inviteToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invites);
  } catch {
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

// Validate invite token (public)
router.get('/invite/:token', async (req, res) => {
  try {
    const invite = await prisma.inviteToken.findUnique({
      where: { token: req.params.token }
    });

    if (!invite) return res.status(404).json({ error: 'Invalid invite code' });
    if (invite.usedAt) return res.status(400).json({ error: 'Invite already used' });
    if (invite.expiresAt < new Date()) return res.status(400).json({ error: 'Invite expired' });

    res.json({ valid: true, role: invite.role });
  } catch {
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Register with invite token
router.post('/register', async (req, res) => {
  const { inviteToken, name, email, password } = req.body;

  if (!inviteToken || !name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const invite = await prisma.inviteToken.findUnique({ where: { token: inviteToken } });
    if (!invite) return res.status(400).json({ error: 'Invalid invite code' });
    if (invite.usedAt) return res.status(400).json({ error: 'Invite already used' });
    if (invite.expiresAt < new Date()) return res.status(400).json({ error: 'Invite expired' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: invite.role, isActive: true }
    });

    await prisma.inviteToken.update({
      where: { token: inviteToken },
      data: { usedAt: new Date(), usedBy: user.id }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getSecret(),
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'If that email exists, a reset code was generated.' });
    }

    // Invalidate old tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    const token = crypto.randomBytes(32).toString('hex'); // 64-char secure token
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt }
    });

    // In production this would send an email. Log to console for demo/development.
    if (process.env.NODE_ENV !== 'production') console.log(`[DEV] Password reset token for ${email}: ${token}`);
    res.json({ message: 'Если такой email зарегистрирован, код восстановления был отправлен.' });
  } catch {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken) return res.status(400).json({ error: 'Invalid reset code' });
    if (resetToken.usedAt) return res.status(400).json({ error: 'Reset code already used' });
    if (resetToken.expiresAt < new Date()) return res.status(400).json({ error: 'Reset code expired' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashed } });
    await prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } });

    res.json({ message: 'Password updated successfully' });
  } catch {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Change own password (authenticated)
router.post('/change-password', authenticate, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    res.json({ message: 'Password changed successfully' });
  } catch {
    res.status(500).json({ error: 'Password change failed' });
  }
});

export default router;

