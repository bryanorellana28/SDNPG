import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { NodeSSH } from 'node-ssh';
import { runBackup } from '../../../lib/backup';
import '../../../lib/scheduler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const data = await prisma.equipment.findMany({ include: { site: true } });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { ip, credentialId, siteId, type } = req.body;
    const cred = await prisma.credential.findUnique({ where: { id: credentialId } });
    if (!cred) return res.status(400).json({ message: 'Credential not found' });

    const existing = await prisma.equipment.findFirst({ where: { ip } });
    if (existing) return res.status(409).json({ message: 'Equipment already exists' });

    const ssh = new NodeSSH();
    try {
      await ssh.connect({ host: ip, username: cred.username, password: cred.password });
      let stdout = '';
      let portsData: { physicalName: string; description: string; status: string }[] = [];
      if (type === 'Mikrotik') {
        stdout = (await ssh.execCommand('/system routerboard print')).stdout;
        portsData = await getMikrotikPorts(ssh);
      } else {
        stdout = (await ssh.execCommand('show version')).stdout;
      }
      const chassis = parseLine(stdout, type === 'Mikrotik' ? 'model:' : 'Model number');
      const serial = parseLine(stdout, type === 'Mikrotik' ? 'serial-number:' : 'System serial number');
      const version =
        type === 'Mikrotik'
          ? parseLine(stdout, 'upgrade-firmware:')
          : parseCiscoVersion(stdout);
      const model = await prisma.model.upsert({
        where: { name: chassis },
        update: {},
        create: { name: chassis },
      });
      let hostname = '';
      if (type === 'Mikrotik') {
        const ident = (await ssh.execCommand('/system identity print')).stdout;
        hostname = parseLine(ident, 'name:');
      } else {
        const ident = (await ssh.execCommand('show running-config | include hostname')).stdout;
        hostname = ident.split('hostname').pop()?.trim() || '';
      }
      const eq = await prisma.equipment.create({
        data: {
          ip,
          hostname,
          chassis,
          serial,
          version,
          type,
          siteId,
          credentialId,
          modelId: model.id,
        },
      });
      if (portsData.length) {
        try {
          await prisma.portInventory.createMany({
            data: portsData.map(port => ({
              equipmentId: eq.id,
              physicalName: port.physicalName,
              description: port.description,
              status: port.status,
            })),
          });
        } catch (err) {
          console.error('No se pudo guardar el inventario de puertos', err);
        }
      }
      try {
        await runBackup(eq.id);
      } catch (e) {
        console.error(e);
      }
      return res.status(201).json(eq);
    } catch (e) {
      return res.status(500).json({ message: 'SSH connection failed' });
    } finally {
      ssh.dispose();
    }
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}

function parseLine(output: string, key: string) {
  const line = output.split('\n').find(l => l.toLowerCase().includes(key.toLowerCase()));
  return line ? line.split(':').slice(1).join(':').trim() : '';
}

function parseCiscoVersion(output: string) {
  const match = output.match(/Version\s+([^,\s]+)/i);
  return match ? match[1] : '';
}

async function getMikrotikPorts(ssh: NodeSSH) {
  const detailOutput = (await ssh.execCommand('/interface ethernet print detail without-paging')).stdout;
  const physicalNames = parseMikrotikDefaultNames(detailOutput);

  const ports: { physicalName: string; description: string; status: string }[] = [];

  for (const physicalName of physicalNames) {
    if (!physicalName) continue;

    let description = '';
    try {
      const command = `/interface ethernet print without-paging where default-name="${physicalName.replace(/"/g, '""')}"`;
      const { stdout } = await ssh.execCommand(command);
      description = parseMikrotikInterfaceName(stdout);
    } catch (error) {
      description = '';
    }

    const finalDescription = description || physicalName;
    const status =
      physicalName.localeCompare(finalDescription, undefined, { sensitivity: 'accent' }) === 0 ? 'Puerto Libre' : 'Asignado';
    ports.push({ physicalName, description: finalDescription, status });
  }

  return ports;
}

function parseMikrotikDefaultNames(output: string) {
  const matches = output.matchAll(/default-name=(["'][^"']*["']|\S+)/gi);
  const names: string[] = [];

  for (const match of matches) {
    const physicalName = stripQuotes(match[1]);
    if (physicalName && !names.includes(physicalName)) {
      names.push(physicalName);
    }
  }

  return names;
}

function parseMikrotikInterfaceName(output: string) {
  if (!output) return '';
  const lines = output.split(/\r?\n/);
  const dataLine = lines.find(line => /^\s*\d+/.test(line));
  if (!dataLine) return '';

  const headerLine = lines.find(line => /\bNAME\b/i.test(line) && /\bMTU\b/i.test(line));
  if (headerLine) {
    const nameStart = headerLine.indexOf('NAME');
    const mtuStart = headerLine.indexOf('MTU');
    if (nameStart >= 0) {
      const raw = dataLine.slice(nameStart, mtuStart > nameStart ? mtuStart : undefined).trim();
      if (raw) return raw;
    }
  }

  const tokens = dataLine.trim().split(/\s+/);
  return tokens.length >= 3 ? tokens[2] : '';
}

function stripQuotes(value: string | undefined) {
  if (!value) return '';
  if (/^(['"]).*\1$/.test(value)) {
    return value.slice(1, -1);
  }
  return value;
}
