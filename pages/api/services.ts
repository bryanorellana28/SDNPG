import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

function sanitizeSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Mark}+/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

function buildHostname(...parts: Array<string | null | undefined>) {
  const segments = parts
    .map(part => (part ?? '').toString().trim())
    .filter(Boolean)
    .map(sanitizeSegment)
    .filter(Boolean);
  return segments.join('-');
}

function baseTemplate(hostname: string) {
  const name = hostname || 'SERVICIO';
  return [
    `/system identity set name="${name}"`,
    `/ip service set telnet disabled`,
    `/ip service set ftp disabled`,
    `/ip service set www disabled`,
    `/ip service set api disabled`,
    `/ip service set api-ssl disabled`,
    `/ip service set ssh address=0.0.0.0/0`,
  ].join('\n');
}

function managedTemplate({ hostname, deviceModel }: { hostname: string; deviceModel: string }) {
  const managementInterface = 'ether1-gestion';
  const identity = hostname || 'SERVICIO-GESTIONADO';
  return [
    `/system identity set name="${identity}"`,
    `/interface ethernet set [ find default-name=ether1 ] name=${managementInterface} comment="Gestion" disabled=no`,
    `/ip address add address=192.168.88.1/24 interface=${managementInterface} comment="Gestion"`,
    `/ip service set telnet disabled`,
    `/ip service set ftp disabled`,
    `/ip service set www disabled`,
    `/ip service set api disabled`,
    `/ip service set api-ssl disabled`,
    `/ip service set ssh address=0.0.0.0/0`,
    `/ip dns set servers=8.8.8.8,1.1.1.1 allow-remote-requests=no`,
    `/system ntp client set enabled=yes servers=time.google.com`,
    `/tool mac-server set allowed-interface-list=${managementInterface}`,
    `/tool mac-server mac-winbox set allowed-interface-list=${managementInterface}`,
    `# Modelo administrado: ${deviceModel}`,
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
    const { clientId, type, equipmentId, portId, deviceModel, serviceIdentifier, locationDescription } = req.body;
    if (!clientId || !type || !serviceIdentifier || !locationDescription) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const client = await prisma.client.findUnique({ where: { id: Number(clientId) } });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const identifier = serviceIdentifier.toString().trim();
    const description = locationDescription.toString().trim();
    if (!identifier || !description) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const hostnameBase = buildHostname(client.name, identifier, description, type, deviceModel);
    const fallbackHostname =
      hostnameBase ||
      buildHostname(client.name, identifier, description, type) ||
      buildHostname(client.name, identifier, description) ||
      sanitizeSegment(client.name) ||
      'SERVICIO';

    const data: any = {
      clientId: Number(clientId),
      type,
      serviceIdentifier: identifier,
      locationDescription: description,
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
      data.config = baseTemplate(fallbackHostname);

      const [service] = await prisma.$transaction([
        prisma.service.create({ data }),
        prisma.portInventory.update({
          where: { id: portRecord.id },
          data: { status: 'Asignado con cliente' },
        }),
      ]);

      return res.status(201).json(service);
    } else if (type === 'GESTIONADO') {
      if (!deviceModel || !equipmentId || !portId) {
        return res.status(400).json({ message: 'Missing managed service fields' });
      }

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

      data.deviceModel = deviceModel;
      data.equipmentId = Number(equipmentId);
      data.port = portRecord.physicalName;
      data.config = managedTemplate({ hostname: fallbackHostname, deviceModel });

      const [service] = await prisma.$transaction([
        prisma.service.create({ data }),
        prisma.portInventory.update({
          where: { id: portRecord.id },
          data: { status: 'Asignado con cliente' },
        }),
      ]);

      return res.status(201).json(service);
    }

    data.config = baseTemplate(fallbackHostname);
    const service = await prisma.service.create({ data });
    return res.status(201).json(service);
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}

