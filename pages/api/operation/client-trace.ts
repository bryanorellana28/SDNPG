import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { NodeSSH } from 'node-ssh';

interface TraceResult {
  equipmentId: number;
  hostname: string;
  ip: string;
  success: boolean;
  output: string;
}

function normalizeMac(mac: unknown) {
  const raw = typeof mac === 'string' ? mac.trim() : '';
  if (!raw) return '';

  const standardized = raw.replace(/-/g, ':');
  if (/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(standardized)) {
    return standardized.toUpperCase();
  }

  const stripped = raw.replace(/[^0-9A-Fa-f]/g, '');
  if (stripped.length === 12) {
    const pairs = stripped.match(/.{1,2}/g);
    return pairs ? pairs.join(':').toUpperCase() : '';
  }

  return '';
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

  const mac = normalizeMac(req.body?.mac);
  if (!mac) {
    return res.status(400).json({ message: 'Ingrese una dirección MAC válida.' });
  }

  const nodes = await prisma.equipment.findMany({
    where: { networkRole: 'Nodo' },
    include: { credential: true },
    orderBy: { hostname: 'asc' },
  });

  if (nodes.length === 0) {
    return res.status(200).json({ message: 'No hay nodos registrados para realizar el rastreo.', results: [], mac });
  }

  const results: TraceResult[] = [];

  for (const node of nodes) {
    if (!node.credential) {
      results.push({
        equipmentId: node.id,
        hostname: node.hostname,
        ip: node.ip,
        success: false,
        output: 'El nodo no tiene una credencial asociada.',
      });
      continue;
    }

    const ssh = new NodeSSH();
    try {
      await ssh.connect({ host: node.ip, username: node.credential.username, password: node.credential.password });
      const command = `/interface bridge host print where mac-address=${mac}`;
      const execResult = await ssh.execCommand(command);
      const rawOutput = [execResult.stdout, execResult.stderr].filter(Boolean).join('\n').trim();
      results.push({
        equipmentId: node.id,
        hostname: node.hostname,
        ip: node.ip,
        success: true,
        output: rawOutput || 'Sin coincidencias para la MAC especificada.',
      });
    } catch (error) {
      results.push({
        equipmentId: node.id,
        hostname: node.hostname,
        ip: node.ip,
        success: false,
        output: 'No se pudo ejecutar el comando en este nodo.',
      });
    } finally {
      ssh.dispose();
    }
  }

  return res.status(200).json({ results, mac });
}

