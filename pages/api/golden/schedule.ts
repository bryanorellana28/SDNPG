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
    const { deviceId, goldenImageId, date } = req.body;
    if (!deviceId || !goldenImageId || !date) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: Number(deviceId) },
      include: { credential: true },
    });
    const image = await prisma.goldenImage.findUnique({ where: { id: Number(goldenImageId) } });
    if (!equipment || !equipment.credential || !image) {
      return res.status(404).json({ message: 'Data not found' });
    }

    const ssh = new NodeSSH();
    try {
      await ssh.connect({
        host: equipment.ip,
        username: equipment.credential.username,
        password: equipment.credential.password,
      });
      const localPath = path.join(process.cwd(), 'var', 'data', 'golden', image.model, image.filename);
      await ssh.putFile(localPath, image.filename);
      const d = new Date(date);
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const formatted = `${months[d.getMonth()]}/${d.getDate()}/${d.getFullYear()}`;
      await ssh.execCommand(`/system scheduler add name="reboot-programado" start-date=${formatted} start-time=02:30:00 on-event="/system reboot"`);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'SSH error' });
    } finally {
      ssh.dispose();
    }

    return res.status(201).json({ message: 'Scheduled' });
  }

  res.setHeader('Allow', 'POST');
  return res.status(405).end('Method Not Allowed');
}
