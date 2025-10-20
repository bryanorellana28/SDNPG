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
    const { ip, credentialId, siteId, type, networkRole } = req.body;
    const cred = await prisma.credential.findUnique({ where: { id: credentialId } });
    if (!cred) return res.status(400).json({ message: 'Credential not found' });

    const existing = await prisma.equipment.findFirst({ where: { ip } });
    if (existing) return res.status(409).json({ message: 'Equipment already exists' });

    const role = networkRole === 'Cliente' ? 'Cliente' : 'Nodo';

    const ssh = new NodeSSH();
    try {
      await ssh.connect({ host: ip, username: cred.username, password: cred.password });
      let stdout = '';
      let portsData: { physicalName: string; description: string; status: string }[] = [];
      let limitantesData: { name: string; bandwidth: string; port: string }[] = [];
      if (type === 'Mikrotik') {
        stdout = (await ssh.execCommand('/system routerboard print')).stdout;
        portsData = await getMikrotikPorts(ssh);
        limitantesData = await getMikrotikLimitantes(ssh);
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
          networkRole: role,
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
      if (limitantesData.length) {
        try {
          await prisma.limitante.createMany({
            data: limitantesData.map(limitante => ({
              equipmentId: eq.id,
              name: limitante.name,
              bandwidth: limitante.bandwidth,
              port: limitante.port,
            })),
          });
        } catch (err) {
          console.error('No se pudo guardar la información de limitantes', err);
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
  const command =
    ':foreach i in=[/interface find] do={:put ( [/interface get $i name] . " - " . [/interface get $i default-name])}';
  const { stdout } = await ssh.execCommand(command);
  const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  const ports: { physicalName: string; description: string; status: string }[] = [];

  for (const line of lines) {
    const [firstSegment, ...rest] = line.split(' - ');
    if (!firstSegment) continue;

    const physicalName = firstSegment.trim();
    const descriptionRaw = rest.length ? rest.join(' - ').trim() : '';
    const description = descriptionRaw || physicalName;
    const comparisonA = physicalName.trim();
    const comparisonB = descriptionRaw.trim();
    const status =
      comparisonA && comparisonA.localeCompare(comparisonB, undefined, { sensitivity: 'base' }) === 0
        ? 'Puerto Libre'
        : 'Asignado';

    ports.push({ physicalName, description, status });
  }

  return ports;
}

async function getMikrotikLimitantes(ssh: NodeSSH) {
  try {
    const { stdout } = await ssh.execCommand('/queue simple export');
    const lines = stdout.split(/\r?\n/);
    const blocks: string[] = [];
    let current: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      if (line.startsWith('add')) {
        if (current.length) {
          blocks.push(current.join(' '));
        }
        current = [line];
      } else if (current.length) {
        current.push(line);
      }
    }

    if (current.length) {
      blocks.push(current.join(' '));
    }

    const cleanValue = (value: string) => value.replace(/\\/g, '').replace(/^"|"$/g, '').trim();

    const limitantes = blocks
      .map(block => block.replace(/\\\s*/g, ' '))
      .map(block => block.replace(/=\s+/g, '='))
      .map(block => block.replace(/\s+/g, ' ').trim())
      .map(block => {
        const nameMatch = block.match(/\bname=(".*?"|\S+)/);
        const bandwidthMatch = block.match(/\bmax-limit=(".*?"|\S+)/);
        const targetMatch = block.match(/\btarget=(".*?"|\S+)/);

        if (!nameMatch || !bandwidthMatch || !targetMatch) {
          return null;
        }

        return {
          name: cleanValue(nameMatch[1]),
          bandwidth: cleanValue(bandwidthMatch[1]),
          port: cleanValue(targetMatch[1]),
        };
      })
      .filter((entry): entry is { name: string; bandwidth: string; port: string } => Boolean(entry));

    return limitantes;
  } catch (error) {
    console.error('No se pudieron obtener las limitantes del equipo', error);
    return [];
  }
}
