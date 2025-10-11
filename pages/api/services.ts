import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

function baseTemplate(name: string) {
  return [
    `/system identity set name="${name}"`,
    `/ip service set telnet disabled`,
    `/ip service set ftp disabled`,
    `/ip service set www disabled`,
    `/ip service set ssh address=0.0.0.0/0`,
  ].join('\n');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const services = await prisma.service.findMany({ include: { client: true, equipment: true } });
    return res.status(200).json(services);
  }

  if (req.method === 'POST') {
    const { clientId, type, equipmentId, portId, deviceModel } = req.body;
    if (!clientId || !type) return res.status(400).json({ message: 'Missing fields' });

    const client = await prisma.client.findUnique({ where: { id: Number(clientId) } });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const data: any = {
      clientId: Number(clientId),
      type,
      config: baseTemplate(client.name),
    };

    if (type === 'CAPA2') {
      if (!equipmentId || !portId)
        return res.status(400).json({ message: 'Missing equipment or port' });

      const portRecord = await prisma.portInventory.findFirst({
        where: { id: Number(portId), equipmentId: Number(equipmentId) },
      });

      if (!portRecord) {
        return res.status(404).json({ message: 'Port not found for equipment' });
      }

      const normalizedStatus = portRecord.status.toLowerCase();
      if (!['puerto libre', 'asignado'].includes(normalizedStatus)) {
        return res.status(409).json({ message: 'El puerto no está disponible para asignación' });
      }

      data.equipmentId = Number(equipmentId);
      data.port = portRecord.physicalName;

      const [service] = await prisma.$transaction([
        prisma.service.create({ data }),
        prisma.portInventory.update({
          where: { id: portRecord.id },
          data: { status: 'Asignado con cliente' },
        }),
      ]);

      return res.status(201).json(service);
    } else if (type === 'GESTIONADO') {
      if (!deviceModel) return res.status(400).json({ message: 'Missing device model' });
      data.deviceModel = deviceModel;
    }

    const service = await prisma.service.create({ data });
    return res.status(201).json(service);
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}

