import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { NodeSSH } from 'node-ssh';
import prisma from '../../../lib/prisma';

interface LogsResponse {
  entries: string[];
}

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

  const { equipmentId, search } = req.body || {};
  if (!equipmentId) {
    return res.status(400).json({ message: 'Debe indicar el equipo a consultar.' });
  }

  const equipment = await prisma.equipment.findUnique({
    where: { id: Number(equipmentId) },
    include: { credential: true },
  });

  if (!equipment || !equipment.credential) {
    return res.status(404).json({ message: 'Equipo no encontrado o sin credenciales.' });
  }

  if (equipment.type !== 'Mikrotik') {
    return res.status(400).json({ message: 'Solo se pueden consultar logs en equipos Mikrotik.' });
  }

  const ssh = new NodeSSH();
  const commandBase = '/log print without-paging';
  const filter = typeof search === 'string' && search.trim() ? ` where message~"${search.trim().replace(/"/g, '')}"` : '';
  const command = `${commandBase}${filter}`;

  try {
    await ssh.connect({
      host: equipment.ip,
      username: equipment.credential.username,
      password: equipment.credential.password,
    });

    const { stdout, stderr } = await ssh.execCommand(command);
    if (stderr && stderr.trim()) {
      throw new Error(stderr.trim());
    }

    const entries = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => Boolean(line));

    const response: LogsResponse = { entries };

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'No se pudieron obtener los logs.' });
  } finally {
    ssh.dispose();
  }
}
