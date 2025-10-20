import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { NodeSSH } from 'node-ssh';
import prisma from '../../../lib/prisma';

const DEFAULT_QUEUE = 'hotspot-default/hotspot-default';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const equipmentId = req.query.equipmentId ? Number(req.query.equipmentId) : undefined;
    if (equipmentId !== undefined && (!Number.isInteger(equipmentId) || equipmentId <= 0)) {
      return res.status(400).json({ message: 'Invalid equipment id' });
    }

    const limitantes = await prisma.limitante.findMany({
      where: equipmentId ? { equipmentId } : undefined,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json(limitantes);
  }

  if (req.method === 'POST') {
    const { equipmentId, name, bandwidth, port } = req.body || {};
    if (!equipmentId || !name || !bandwidth || !port) {
      return res.status(400).json({ message: 'Debe completar todos los campos requeridos.' });
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: Number(equipmentId) },
      include: { credential: true },
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipo no encontrado.' });
    }

    if (equipment.type !== 'Mikrotik') {
      return res.status(400).json({ message: 'Las limitantes solo pueden configurarse en equipos Mikrotik.' });
    }

    if (!equipment.credential) {
      return res.status(400).json({ message: 'El equipo no tiene credenciales asociadas.' });
    }

    const ssh = new NodeSSH();
    const clean = (value: string) => value.replace(/"/g, '').trim();
    const queueCommand = `/queue simple add max-limit=${clean(bandwidth)} name="${clean(name)}" queue=${DEFAULT_QUEUE} target=${clean(port)}`;

    try {
      await ssh.connect({
        host: equipment.ip,
        username: equipment.credential.username,
        password: equipment.credential.password,
      });

      const { stderr } = await ssh.execCommand(queueCommand);
      if (stderr && stderr.trim()) {
        throw new Error(stderr.trim());
      }

      const created = await prisma.limitante.create({
        data: {
          equipmentId: Number(equipmentId),
          name: clean(name),
          bandwidth: clean(bandwidth),
          port: clean(port),
        },
      });

      return res.status(201).json(created);
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || 'No se pudo crear la limitante.' });
    } finally {
      ssh.dispose();
    }
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}
