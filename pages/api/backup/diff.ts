import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import prisma from '../../../lib/prisma';
import { execSync } from 'child_process';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).end('Unauthorized');
  }

  const { id1, id2, path: filePath } = req.query as any;
  if (id1 && id2) {
    const b1 = await prisma.backup.findUnique({ where: { id: Number(id1) } });
    const b2 = await prisma.backup.findUnique({ where: { id: Number(id2) } });
    if (!b1 || !b2) return res.status(404).end('Not found');
    try {
      const diff = execSync(`diff -u ${b1.exportPath} ${b2.exportPath}`, { encoding: 'utf-8' });
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(diff || 'No differences');
    } catch (e: any) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(e.stdout || 'No differences');
    }
  }

  if (!filePath) {
    return res.status(400).end('path required');
  }
  try {
    const content = fs.readFileSync(filePath as string, 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(content);
  } catch {
    return res.status(404).end('Not found');
  }
}
