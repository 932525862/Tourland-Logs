import { Body, Controller, Param, Post } from '@nestjs/common';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '@/prisma/prisma.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Module } from '@nestjs/common';

class SubmitDto {
  @IsString() @IsNotEmpty() formId!: string;
  @IsObject() data!: Record<string, string>;
}

@Controller('public')
class PublicController {
  constructor(private prisma: PrismaService, private rt: RealtimeGateway) {}

  // Public form submission: rate-limited
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('submit')
  async submit(@Body() dto: SubmitDto) {
    const form = await this.prisma.formTemplate.findUnique({ where: { id: dto.formId } });
    if (!form) return { ok: false, message: 'Form not found' };
    const created = await this.prisma.client.create({
      data: {
        formId: form.id,
        formTitle: form.title,
        categoryId: form.targetCategoryId,
        data: dto.data as any,
        stage: 'new',
      },
    });
    this.rt.broadcast('client:new', { id: created.id });
    return { ok: true, id: created.id };
  }
}

@Module({ controllers: [PublicController] })
export class PublicModule {}
