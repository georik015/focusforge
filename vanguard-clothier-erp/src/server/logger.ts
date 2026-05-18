import { prisma } from '../lib/prisma';


export async function logActivity(userId: string, action: string, details?: any) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : null,
      }
    });
  } catch (error) {
    console.error('Audit Logging Failed:', error);
  }
}

