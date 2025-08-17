import prisma from './prisma';
import { NodeSSH } from 'node-ssh';
import path from 'path';

const ONE_MINUTE = 60 * 1000;

setInterval(async () => {
  const jobs = await prisma.job.findMany({
    where: {
      type: 'upgrade',
      status: 'pending',
      scheduledAt: { lte: new Date() },
    },
    include: {
      equipment: { include: { credential: true } },
      goldenImage: true,
    },
  });

  for (const job of jobs) {
    const equipment = job.equipment;
    const cred = equipment.credential;
    const image = job.goldenImage;
    if (!equipment || !cred || !image) {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'failed' } });
      continue;
    }
    const ssh = new NodeSSH();
    try {
      await ssh.connect({ host: equipment.ip, username: cred.username, password: cred.password });
      const localPath = path.join(process.cwd(), 'var', 'data', 'golden', image.model, image.filename);
      await ssh.putFile(localPath, image.filename);
      await prisma.job.update({ where: { id: job.id }, data: { status: 'completed' } });
    } catch (e) {
      console.error(e);
      await prisma.job.update({ where: { id: job.id }, data: { status: 'failed' } });
    } finally {
      ssh.dispose();
    }
  }
}, ONE_MINUTE);
