import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { NodeSSH } from 'node-ssh';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { equipmentId, action } = req.body;
  const eq = await prisma.equipment.findUnique({
    where: { id: Number(equipmentId) },
    include: { credential: true },
  });
  if (!eq || !eq.credential) return res.status(404).json({ message: 'Equipment not found' });

  const ssh = new NodeSSH();
  try {
    await ssh.connect({ host: eq.ip, username: eq.credential.username, password: eq.credential.password });
    let command = '';
    switch (action) {
      case 'port':
        command = '/interface ethernet print';
        break;
      case 'communication':
        command = 'ping 8.8.8.8 count=4';
        break;
      case 'cpu':
        command = '/system resource print';
        break;
      case 'memory':
        command = '/system resource print';
        break;
      case 'logs':
        command = '/log print without-paging';
        break;
      default:
        return res.status(400).json({ message: 'Unknown action' });
    }
    const result = await ssh.execCommand(command);
    return res.status(200).json({ output: result.stdout });
  } catch {
    return res.status(500).json({ message: 'SSH connection failed' });
  } finally {
    ssh.dispose();
  }
}

