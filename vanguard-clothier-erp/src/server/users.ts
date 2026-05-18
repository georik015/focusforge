import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { authenticate, authorize, AuthRequest } from './auth';

const router = Router();

// GET /users — список всех пользователей (только ADMIN)
router.get('/', authenticate, authorize(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        warehouseId: true,
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /users — создать пользователя (только ADMIN)
router.post('/', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { name, email, password, role, warehouseId } = req.body as {
    name: string;
    email: string;
    password: string;
    role: string;
    warehouseId?: string;
  };

  if (!name?.trim() || !email?.trim() || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password and role are required' });
  }

  const validRoles = ['ADMIN', 'SELLER', 'STOREKEEPER'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hash,
        role,
        warehouseId: warehouseId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        warehouseId: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_CREATED',
        details: `Created user: ${user.name} (${user.email}), role: ${user.role}`,
      },
    });

    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /users/:id — обновить данные пользователя
router.patch('/:id', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  const { name, email, role, warehouseId, password } = req.body as {
    name?: string;
    email?: string;
    role?: string;
    warehouseId?: string | null;
    password?: string;
  };

  if (id === req.user!.id && role && role !== req.user!.role) {
    return res.status(403).json({ error: 'Cannot change your own role' });
  }

  try {
    const data: any = {};
    if (name) data.name = name.trim();
    if (email) data.email = email.trim().toLowerCase();
    if (role) data.role = role;
    if (warehouseId !== undefined) data.warehouseId = warehouseId || null;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_UPDATED',
        details: `Updated user: ${user.name} (${user.email})`,
      },
    });

    res.json(user);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    res.status(400).json({ error: 'Failed to update user' });
  }
});

// PATCH /users/:id/toggle — активировать/деактивировать
router.patch('/:id/toggle', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };

  if (id === req.user!.id) {
    return res.status(403).json({ error: 'Cannot deactivate your own account' });
  }

  try {
    const current = await prisma.user.findUnique({ where: { id }, select: { isActive: true, name: true } });
    if (!current) return res.status(404).json({ error: 'User not found' });

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        details: `${user.isActive ? 'Activated' : 'Deactivated'} user: ${user.name}`,
      },
    });

    res.json(user);
  } catch {
    res.status(400).json({ error: 'Failed to toggle user status' });
  }
});

// POST /users/:id/reset-password — admin resets a staff member's password
router.post('/:id/reset-password', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  const { newPassword } = req.body as { newPassword: string };

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { id },
      data: { password: hash },
      select: { id: true, name: true, email: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_PASSWORD_RESET',
        details: `Admin reset password for: ${user.name} (${user.email})`,
      },
    });

    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Не удалось сбросить пароль' });
  }
});

export default router;

