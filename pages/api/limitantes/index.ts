import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { NodeSSH } from 'node-ssh';
import prisma from '../../../lib/prisma';

const DEFAULT_QUEUE = 'hotspot-default/hotspot-default';
const cleanValue = (value: string) => value.replace(/"/g, '').trim();

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
    const queueCommand = `/queue simple add max-limit=${cleanValue(bandwidth)} name="${cleanValue(name)}" queue=${DEFAULT_QUEUE} target=${cleanValue(port)}`;

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
          name: cleanValue(name),
          bandwidth: cleanValue(bandwidth),
          port: cleanValue(port),
        },
      });

      return res.status(201).json(created);
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || 'No se pudo crear la limitante.' });
    } finally {
      ssh.dispose();
    }
  }

  if (req.method === 'DELETE') {
    const idParam = req.query.id ?? req.body?.id;
    const limitanteId = Number(idParam);
    if (!Number.isInteger(limitanteId) || limitanteId <= 0) {
      return res.status(400).json({ message: 'Identificador de limitante inválido.' });
    }

    const limitante = await prisma.limitante.findUnique({
      where: { id: limitanteId },
      include: {
        equipment: {
          include: { credential: true },
        },
      },
    });

    if (!limitante) {
      return res.status(404).json({ message: 'Limitante no encontrada.' });
    }

    if (!limitante.equipment) {
      return res.status(400).json({ message: 'La limitante no tiene un equipo asociado.' });
    }

    if (limitante.equipment.type !== 'Mikrotik') {
      return res.status(400).json({ message: 'Solo se pueden eliminar limitantes en equipos Mikrotik.' });
    }

    if (!limitante.equipment.credential) {
      return res.status(400).json({ message: 'El equipo asociado no cuenta con credenciales.' });
    }

    const ssh = new NodeSSH();
    const removeCommand = `/queue simple remove [find name="${cleanValue(limitante.name)}"]`;

    try {
      await ssh.connect({
        host: limitante.equipment.ip,
        username: limitante.equipment.credential.username,
        password: limitante.equipment.credential.password,
      });

      const { stderr } = await ssh.execCommand(removeCommand);
      if (stderr && stderr.trim()) {
        throw new Error(stderr.trim());
      }

      await prisma.limitante.delete({ where: { id: limitanteId } });
      return res.status(200).json({ message: 'Limitante eliminada correctamente.' });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message || 'No se pudo eliminar la limitante.' });
    } finally {
      ssh.dispose();
    }
  }

  res.setHeader('Allow', 'GET,POST,DELETE');
  return res.status(405).end('Method Not Allowed');
}
