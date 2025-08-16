import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
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
    const entry = await prisma.credential.findUnique({ where: { id: Number(id) } });
    return res.status(200).json(entry);
  }

  if (req.method === 'PUT') {
    const { username, password, description } = req.body;
    const entry = await prisma.credential.update({
      where: { id: Number(id) },
      data: { username, password, description },
    });
    return res.status(200).json(entry);
  }
  if (req.method === 'DELETE') {
    await prisma.credential.delete({ where: { id: Number(id) } });
    return res.status(204).end();
  }
  res.setHeader('Allow', 'PUT,DELETE');
  return res.status(405).end('Method Not Allowed');
}
