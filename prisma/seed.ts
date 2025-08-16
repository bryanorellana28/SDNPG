import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHashed = await bcrypt.hash('admin', 10);
  const operatorHashed = await bcrypt.hash('operator', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: adminHashed, role: 'ADMIN' },
  });

  await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: { username: 'operator', password: operatorHashed, role: 'OPERATOR' },
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
