import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
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
    const clients = await prisma.client.findMany({ include: { services: true } });
    return res.status(200).json(clients);
  }

  if (req.method === 'POST') {
    const { name, contact } = req.body;
    if (!name) return res.status(400).json({ message: 'Missing name' });
    const client = await prisma.client.create({ data: { name, contact } });
    return res.status(201).json(client);
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}

