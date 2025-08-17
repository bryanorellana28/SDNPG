import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { runBackup } from '../../../lib/backup';
import '../../../lib/scheduler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { deviceId } = req.body as { deviceId?: number };
  if (!deviceId) {
    return res.status(400).json({ message: 'deviceId required' });
  }
  try {
    const backup = await runBackup(deviceId);
    return res.status(200).json({
      backupId: backup.id,
      exportPath: backup.exportPath,
      binaryPath: backup.binaryPath,
      diffPath: backup.diffPath,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Backup failed' });
  }
}

