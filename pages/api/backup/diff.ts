import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).end('Unauthorized');
  }

  const filePath = req.query.path as string;
  if (!filePath) {
    return res.status(400).end('path required');
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(content);
  } catch {
    return res.status(404).end('Not found');
  }
}
