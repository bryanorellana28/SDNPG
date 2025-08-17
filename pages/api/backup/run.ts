import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { NodeSSH } from 'node-ssh';
import prisma from '../../../lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

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

  const equipment = await prisma.equipment.findUnique({
    where: { id: Number(deviceId) },
    include: { credential: true },
  });

  if (!equipment || !equipment.credential) {
    return res.status(404).json({ message: 'Equipment or credential not found' });
  }

  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host: equipment.ip,
      username: equipment.credential.username,
      password: equipment.credential.password,
    });

    const timestamp = Date.now();
    const remoteExport = `config-${timestamp}.rsc`;
    const remoteBackup = `backup-${timestamp}.backup`;

    await ssh.execCommand(`/export file=${remoteExport}`);
    await ssh.execCommand(`/system/backup/save name=${remoteBackup}`);

    const baseDir = path.join(process.cwd(), 'var', 'data', 'backups', String(deviceId));
    const exportDir = path.join(baseDir, 'export');
    const binaryDir = path.join(baseDir, 'binary');
    const diffDir = path.join(baseDir, 'diff');
    fs.mkdirSync(exportDir, { recursive: true });
    fs.mkdirSync(binaryDir, { recursive: true });
    fs.mkdirSync(diffDir, { recursive: true });

    const localExport = path.join(exportDir, remoteExport);
    const localBinary = path.join(binaryDir, remoteBackup);

    await ssh.getFile(localExport, remoteExport);
    await ssh.getFile(localBinary, remoteBackup);

    await ssh.execCommand(`/file/remove ${remoteExport}`);
    await ssh.execCommand(`/file/remove ${remoteBackup}`);

    const exportData = fs.readFileSync(localExport);
    const binaryData = fs.readFileSync(localBinary);
    const exportHash = crypto.createHash('sha256').update(exportData).digest('hex');
    const binaryHash = crypto.createHash('sha256').update(binaryData).digest('hex');

    let diffPath: string | null = null;
    const rscFiles = fs.readdirSync(exportDir).filter((f) => f.endsWith('.rsc')).sort();
    if (rscFiles.length > 1) {
      const prev = path.join(exportDir, rscFiles[rscFiles.length - 2]);
      const diffFile = `diff-${timestamp}.txt`;
      diffPath = path.join(diffDir, diffFile);
      const diff = spawnSync('diff', ['-u', prev, localExport], { encoding: 'utf-8' });
      fs.writeFileSync(diffPath, diff.stdout);
    }

    const backup = await prisma.backup.create({
      data: {
        deviceId: Number(deviceId),
        exportPath: localExport,
        exportHash,
        binaryPath: localBinary,
        binaryHash,
        diffPath,
      },
    });

    return res.status(200).json({
      backupId: backup.id,
      exportPath: localExport,
      binaryPath: localBinary,
      diffPath,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Backup failed' });
  } finally {
    ssh.dispose();
  }
}

