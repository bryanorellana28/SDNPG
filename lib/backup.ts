import { NodeSSH } from 'node-ssh';
import prisma from './prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

export async function runBackup(deviceId: number) {
  const equipment = await prisma.equipment.findUnique({
    where: { id: Number(deviceId) },
    include: { credential: true },
  });
  if (!equipment || !equipment.credential) {
    throw new Error('Equipment or credential not found');
  }

  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: equipment.ip,
      username: equipment.credential.username,
      password: equipment.credential.password,
    });

    const timestamp = Date.now();
    const exportName = `config-${timestamp}.rsc`;

    const result = await ssh.execCommand('/export verbose');

    const baseDir = path.join(process.cwd(), 'var', 'data', 'backups', String(deviceId));
    const exportDir = path.join(baseDir, 'export');
    const diffDir = path.join(baseDir, 'diff');
    fs.mkdirSync(exportDir, { recursive: true });
    fs.mkdirSync(diffDir, { recursive: true });

    const localExport = path.join(exportDir, exportName);
    fs.writeFileSync(localExport, result.stdout);

    const exportHash = crypto.createHash('sha256').update(result.stdout).digest('hex');

    let diffPath: string | null = null;
    const rscFiles = fs.readdirSync(exportDir).filter(f => f.endsWith('.rsc')).sort();
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
        diffPath,
      },
    });
    return backup;
  } finally {
    ssh.dispose();
  }
}

export default runBackup;
