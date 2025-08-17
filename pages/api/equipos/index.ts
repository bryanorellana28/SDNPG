import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
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

  if (req.method === 'GET') {
    const data = await prisma.equipment.findMany({ include: { site: true } });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { ip, credentialId, siteId, type } = req.body;
    const cred = await prisma.credential.findUnique({ where: { id: credentialId } });
    if (!cred) return res.status(400).json({ message: 'Credential not found' });

    const ssh = new NodeSSH();
    try {
      await ssh.connect({ host: ip, username: cred.username, password: cred.password });
      let stdout = '';
      if (type === 'Mikrotik') {
        stdout = (await ssh.execCommand('/system routerboard print')).stdout;
      } else {
        stdout = (await ssh.execCommand('show version')).stdout;
      }
      const chassis = parseLine(stdout, type === 'Mikrotik' ? 'model:' : 'Model number');
      const serial = parseLine(stdout, type === 'Mikrotik' ? 'serial-number:' : 'System serial number');
      const version =
        type === 'Mikrotik'
          ? parseLine(stdout, 'upgrade-firmware:')
          : parseCiscoVersion(stdout);
      const eq = await prisma.equipment.create({
        data: {
          ip,
          chassis,
          serial,
          version,
          type,
          siteId,
          credentialId,
        },
      });
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
