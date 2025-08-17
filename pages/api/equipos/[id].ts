import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { id },
    method,
  } = req;

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const eqId = Number(id);

  if (method === 'GET') {
    const eq = await prisma.equipment.findUnique({ where: { id: eqId }, include: { site: true } });
    return res.status(200).json(eq);
  }

  if (method === 'PUT') {
    const { ip, credentialId, siteId, type, hostname } = req.body;
    const eq = await prisma.equipment.update({
      where: { id: eqId },
      data: { ip, credentialId, siteId, type, hostname },
    });
    return res.status(200).json(eq);
  }

  if (method === 'DELETE') {
    await prisma.equipment.delete({ where: { id: eqId } });
    return res.status(200).json({ message: 'Deleted' });
  }

  res.setHeader('Allow', 'GET,PUT,DELETE');
  return res.status(405).end('Method Not Allowed');
}
