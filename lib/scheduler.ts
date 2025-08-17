import prisma from './prisma';
import { runBackup } from './backup';

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

setInterval(async () => {
  const devices = await prisma.equipment.findMany();
  for (const d of devices) {
    try {
      await runBackup(d.id);
    } catch (e) {
      console.error(e);
    }
  }
}, TWELVE_HOURS);
