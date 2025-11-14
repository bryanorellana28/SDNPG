import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { NodeSSH } from 'node-ssh';
import prisma from '../../../lib/prisma';

interface FiberResponse {
  txPower: string;
  rxPower: string;
  status: 'OPTIMO' | 'ATENUADO' | 'REPARAR FIBRA';
  level: 'success' | 'warning' | 'danger';
}

const cleanValue = (value: string) => value.replace(/[\r\n\t]+/g, ' ').trim();

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

  const { equipmentId, interfaceName } = req.body || {};
  if (!equipmentId || !interfaceName) {
    return res.status(400).json({ message: 'Debe indicar el equipo y la interfaz.' });
  }

  const equipment = await prisma.equipment.findUnique({
    where: { id: Number(equipmentId) },
    include: { credential: true },
  });

  if (!equipment) {
    return res.status(404).json({ message: 'Equipo no encontrado.' });
  }

  if (equipment.type !== 'Mikrotik') {
    return res.status(400).json({ message: 'Solo se pueden verificar equipos Mikrotik.' });
  }

  if (!equipment.credential) {
    return res.status(400).json({ message: 'El equipo no tiene credenciales asociadas.' });
  }

  const ssh = new NodeSSH();
  const sanitizedInterface = interfaceName.replace(/"/g, '').trim();
  const command = `/interface ethernet monitor "${sanitizedInterface}" once without-paging`;

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

    if (!stdout.trim()) {
      throw new Error('El equipo no retornó información para la interfaz seleccionada.');
    }

    const txMatch = stdout.match(/sfp-tx-power:\s*([-+]?\d+(?:\.\d+)?)\s*dBm/i);
    const rxMatch = stdout.match(/sfp-rx-power:\s*([-+]?\d+(?:\.\d+)?)\s*dBm/i);

    const txPower = txMatch ? `${cleanValue(txMatch[0].split(':')[1])}` : 'No disponible';
    const rxPower = rxMatch ? `${cleanValue(rxMatch[0].split(':')[1])}` : 'No disponible';

    const parseNumber = (value: string) => {
      const match = value.match(/[-+]?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : NaN;
    };

    const evaluatePower = (power: number): 'success' | 'warning' | 'danger' => {
      if (Number.isNaN(power)) {
        return 'warning';
      }
      if (power <= -1 && power >= -18) {
        return 'success';
      }
      if (power < -18 && power >= -25) {
        return 'warning';
      }
      if (power < -25) {
        return 'danger';
      }
      return 'success';
    };

    const txLevel = evaluatePower(parseNumber(txPower));
    const rxLevel = evaluatePower(parseNumber(rxPower));

    const severityOrder: Record<'success' | 'warning' | 'danger', number> = {
      success: 1,
      warning: 2,
      danger: 3,
    };

    const level = severityOrder[txLevel] >= severityOrder[rxLevel] ? txLevel : rxLevel;
    const status: FiberResponse['status'] =
      level === 'success' ? 'OPTIMO' : level === 'warning' ? 'ATENUADO' : 'REPARAR FIBRA';

    const response: FiberResponse = {
      txPower,
      rxPower,
      status,
      level,
    };

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'No se pudo consultar el estado de la fibra.' });
  } finally {
    ssh.dispose();
  }
}
