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
    const images = await prisma.goldenImage.findMany({ include: { models: true } });
    const data = await Promise.all(
      images.map(async img => {
        const count = await prisma.equipment.count({ where: { model: { goldenImageId: img.id } } });
        return { ...img, count };
      })
    );
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { model, version = '', file, filename } = req.body;
    if (!model || !file || !filename) {
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

    await prisma.model.upsert({
      where: { name: model },
      update: { goldenImageId: image.id },
      create: { name: model, goldenImageId: image.id },
    });

    return res.status(201).json(image);
  }

  if (req.method === 'DELETE') {
    const { id, model } = req.body;
    const img = model
      ? await prisma.goldenImage.findUnique({ where: { model } })
      : await prisma.goldenImage.findUnique({ where: { id: Number(id) } });
    if (!img) return res.status(404).json({ message: 'Not found' });
    const dir = path.join(process.cwd(), 'var', 'data', 'golden', img.model);
    try {
      fs.unlinkSync(path.join(dir, img.filename));
      fs.unlinkSync(path.join(dir, 'metadata.json'));
    } catch {}
    await prisma.goldenImage.delete({ where: { id: img.id } });
    await prisma.model.updateMany({ where: { goldenImageId: img.id }, data: { goldenImageId: null } });
    return res.status(200).json({ message: 'Deleted' });
  }

  res.setHeader('Allow', 'GET,POST,DELETE');
  return res.status(405).end('Method Not Allowed');
}
