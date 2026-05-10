import { Global, Module, OnModuleInit, OnModuleDestroy, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma');
  async onModuleInit() {
    await this.$connect();
    await this.bootstrap();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
  private async bootstrap() {
    const dir = await this.director.findFirst();
    if (!dir) {
      const password = await bcrypt.hash(process.env.DIRECTOR_PASSWORD || 'admin123', 10);
      await this.director.create({
        data: {
          name: process.env.DIRECTOR_NAME || 'Direktor',
          login: process.env.DIRECTOR_LOGIN || 'admin',
          password,
        },
      });
      this.logger.log('Bootstrap director created');
    }
    const cats = await this.category.count();
    if (cats === 0) {
      await this.category.createMany({
        data: [
          { name: 'Yangi mijozlar', isArchive: false },
          { name: 'Arxiv', isArchive: true },
        ],
      });
    }
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
