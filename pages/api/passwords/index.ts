import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    if (payload.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const entries = await prisma.credential.findMany();
    return res.status(200).json(entries);
  }
  if (req.method === 'POST') {
    const { username, password, description } = req.body;
    const entry = await prisma.credential.create({
      data: { username, password, description },
    });
    return res.status(201).json(entry);
  }
  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}
