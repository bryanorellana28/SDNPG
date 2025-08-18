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
    const sites = await prisma.site.findMany();
    return res.status(200).json(sites);
  }
  if (req.method === 'POST') {
    const { nombre, clave, ubicacion, zona, direccion } = req.body;
    const existing = await prisma.site.findFirst({ where: { nombre, clave, ubicacion, zona, direccion } });
    if (existing) return res.status(409).json({ message: 'Site already exists' });
    const site = await prisma.site.create({
      data: { nombre, clave, ubicacion, zona, direccion },
    });
    return res.status(201).json(site);
  }
  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}
