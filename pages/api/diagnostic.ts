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

  const { equipmentId, command } = req.body;
  const eq = await prisma.equipment.findUnique({
    where: { id: Number(equipmentId) },
    include: { credential: true },
  });
  if (!eq || !eq.credential) return res.status(404).json({ message: 'Equipment not found' });

  if (!command || typeof command !== 'string' || !command.trim()) {
    return res.status(400).json({ message: 'No command provided' });
  }

  const ssh = new NodeSSH();
  try {
    await ssh.connect({ host: eq.ip, username: eq.credential.username, password: eq.credential.password });
    const result = await ssh.execCommand(command.trim());
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    return res.status(200).json({ output: output || 'Comando ejecutado sin salida' });
  } catch {
    return res.status(500).json({ message: 'SSH connection failed' });
  } finally {
    ssh.dispose();
  }
}

