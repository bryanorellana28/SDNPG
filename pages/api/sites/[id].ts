import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const site = await prisma.site.findUnique({ where: { id: Number(id) } });
    return res.status(200).json(site);
  }

  if (req.method === 'PUT') {
    const { nombre, clave, ubicacion, zona, direccion } = req.body;
    const site = await prisma.site.update({
      where: { id: Number(id) },
      data: { nombre, clave, ubicacion, zona, direccion },
    });
    return res.status(200).json(site);
  }
  if (req.method === 'DELETE') {
    await prisma.site.delete({ where: { id: Number(id) } });
    return res.status(204).end();
  }
  res.setHeader('Allow', 'PUT,DELETE');
  return res.status(405).end('Method Not Allowed');
}
