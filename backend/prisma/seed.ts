import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const exists = await prisma.director.findFirst();
  if (!exists) {
    const password = await bcrypt.hash(process.env.DIRECTOR_PASSWORD || 'admin123', 10);
    await prisma.director.create({
      data: {
        name: process.env.DIRECTOR_NAME || 'Direktor',
        login: process.env.DIRECTOR_LOGIN || 'admin',
        password,
      },
    });
    console.log('Bootstrap director created');
  }

  const cats = await prisma.category.count();
  if (cats === 0) {
    await prisma.category.createMany({
      data: [
        { name: 'Yangi mijozlar', isArchive: false },
        { name: 'Arxiv', isArchive: true },
      ],
    });
    console.log('Default categories created');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
