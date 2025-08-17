import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { NodeSSH } from 'node-ssh';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { deviceId, goldenImageId } = req.body;
    if (!deviceId || !goldenImageId) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: Number(deviceId) },
      include: { credential: true },
    });
    const image = await prisma.goldenImage.findUnique({
      where: { id: Number(goldenImageId) },
    });

    if (!equipment || !equipment.credential || !image) {
      return res.status(400).json({ message: 'Invalid device or image' });
    }

    const ssh = new NodeSSH();
    try {
      await ssh.connect({
        host: equipment.ip,
        username: equipment.credential.username,
        password: equipment.credential.password,
      });
      const localPath = path.join(
        process.cwd(),
        'var',
        'data',
        'golden',
        image.model,
        image.filename
      );
      await ssh.putFile(localPath, image.filename);
      await prisma.job.create({
        data: {
          deviceId: Number(deviceId),
          type: 'upgrade',
          status: 'completed',
          scheduledAt: new Date(),
          goldenImageId: Number(goldenImageId),
        },
      });
      return res.status(200).json({ message: 'Uploaded' });
    } catch (e) {
      console.error(e);
      await prisma.job.create({
        data: {
          deviceId: Number(deviceId),
          type: 'upgrade',
          status: 'failed',
          scheduledAt: new Date(),
          goldenImageId: Number(goldenImageId),
        },
      });
      return res.status(500).json({ message: 'Upload failed' });
    } finally {
      ssh.dispose();
    }
  }

  res.setHeader('Allow', 'POST');
  return res.status(405).end('Method Not Allowed');
}
