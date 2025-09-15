import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const equipmentId = Number(req.query.equipmentId);
  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return res.status(400).json({ message: 'Invalid equipment id' });
  }

  if (req.method === 'GET') {
    const ports = await prisma.portInventory.findMany({
      where: { equipmentId },
      orderBy: { physicalName: 'asc' },
    });

    const total = ports.length;
    const inUse = ports.filter(p => p.status.toLowerCase() === 'asignado').length;
    const free = ports.filter(p => p.status.toLowerCase() === 'puerto libre').length;
    const usagePercent = total ? (inUse / total) * 100 : 0;
    const freePercent = total ? (free / total) * 100 : 0;

    return res.status(200).json({
      ports,
      stats: {
        total,
        inUse,
        free,
        usagePercent,
        freePercent,
      },
    });
  }

  res.setHeader('Allow', 'GET');
  return res.status(405).end('Method Not Allowed');
}
