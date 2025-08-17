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

  if (req.method === 'GET') {
    const backups = await prisma.backup.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json(backups);
  }

  res.setHeader('Allow', 'GET');
  return res.status(405).end('Method Not Allowed');
}
