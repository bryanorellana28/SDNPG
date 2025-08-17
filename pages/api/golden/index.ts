import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const images = await prisma.goldenImage.findMany();
    return res.status(200).json(images);
  }

  if (req.method === 'POST') {
    const { model, version, file, filename } = req.body;
    if (!model || !version || !file || !filename) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const buffer = Buffer.from(file, 'base64');
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const dir = path.join(process.cwd(), 'var', 'data', 'golden', model);
    fs.mkdirSync(dir, { recursive: true });

    const existing = await prisma.goldenImage.findUnique({ where: { model } });
    if (existing) {
      try {
        fs.unlinkSync(path.join(dir, existing.filename));
        fs.unlinkSync(path.join(dir, 'metadata.json'));
      } catch {}
      await prisma.goldenImage.delete({ where: { id: existing.id } });
    }

    const destName = filename;
    const destPath = path.join(dir, destName);
    fs.writeFileSync(destPath, buffer);

    const metadata = {
      model,
      version,
      filename: destName,
      sha256,
      uploadedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    const image = await prisma.goldenImage.create({
      data: { model, version, filename: destName, sha256 },
    });
    return res.status(201).json(image);
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}
