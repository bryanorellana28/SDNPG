import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import '../../../lib/goldenScheduler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { deviceId, goldenImageId, date } = req.body;
    if (!deviceId || !goldenImageId || !date) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const scheduledAt = new Date(date);
    const job = await prisma.job.create({
      data: {
        deviceId: Number(deviceId),
        type: 'upgrade',
        status: 'pending',
        scheduledAt,
        goldenImageId: Number(goldenImageId),
      },
    });
    return res.status(201).json(job);
  }

  res.setHeader('Allow', 'POST');
  return res.status(405).end('Method Not Allowed');
}
