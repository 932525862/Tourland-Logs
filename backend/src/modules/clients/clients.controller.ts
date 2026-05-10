import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min, MaxLength, IsNumber,
} from 'class-validator';
import { ClientStage, SaleStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '@/common/decorators/current-user.decorator';
import { RealtimeGateway } from '../realtime/realtime.gateway';

class CreateClientDto {
  @IsString() @IsNotEmpty() formId!: string;
  @IsString() @IsNotEmpty() formTitle!: string;
  @IsString() @IsNotEmpty() categoryId!: string;
  @IsObject() data!: Record<string, string>;
  @IsOptional() @IsEnum(ClientStage) stage?: ClientStage;
}

class UpdateClientDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsEnum(ClientStage) stage?: ClientStage;
  @IsOptional() @IsObject() data?: Record<string, string>;
  @IsOptional() @IsInt() telegramChatId?: number;
  @IsOptional() @IsString() @MaxLength(64) telegramUsername?: string;
}

class CallActionDto {
  @IsOptional() @IsString() remindAt?: string; // ISO
}

class NoteDto {
  @IsString() @IsNotEmpty() @MaxLength(2000) text!: string;
}

class PaymentDto {
  @IsNumber() @Min(0) amount!: number;
}

class SaleSetupDto {
  @IsEnum(SaleStatus) status!: SaleStatus;
  @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
  @IsOptional() @IsString() nextPaymentAt?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private prisma: PrismaService, private rt: RealtimeGateway) {}

  @Get()
  list(@Query('categoryId') categoryId?: string, @Query('stage') stage?: ClientStage) {
    return this.prisma.client.findMany({
      where: { ...(categoryId && { categoryId }), ...(stage && { stage }) },
      include: { notes: { orderBy: { createdAt: 'desc' } }, payments: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.prisma.client.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: 'desc' } }, payments: { orderBy: { createdAt: 'desc' } } },
    });
  }

  @Post()
  async create(@Body() dto: CreateClientDto) {
    const created = await this.prisma.client.create({
      data: {
        formId: dto.formId,
        formTitle: dto.formTitle,
        categoryId: dto.categoryId,
        data: dto.data as any,
        stage: dto.stage ?? 'new',
      },
    });
    this.rt.broadcast('client:new', { id: created.id });
    return created;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    const c = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.stage && { stage: dto.stage }),
        ...(dto.data && { data: dto.data as any }),
        ...(dto.telegramChatId !== undefined && { telegramChatId: BigInt(dto.telegramChatId) }),
        ...(dto.telegramUsername !== undefined && { telegramUsername: dto.telegramUsername }),
      },
    });
    this.rt.broadcast('client:update', { id: c.id });
    return c;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.client.delete({ where: { id } });
    this.rt.broadcast('client:delete', { id });
    return { ok: true };
  }

  @Post(':id/call/start')
  async callStart(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (user.role !== 'employee') return { ok: false, reason: 'employee_only' };
    const c = await this.prisma.client.update({
      where: { id },
      data: { inCallByEmployeeId: user.sub, inCallStartedAt: new Date() },
    });
    this.rt.broadcast('client:update', { id: c.id });
    return c;
  }

  @Post(':id/call/end')
  async callEnd(@Param('id') id: string, @Body() dto: CallActionDto) {
    const c = await this.prisma.client.update({
      where: { id },
      data: {
        inCallByEmployeeId: null,
        inCallStartedAt: null,
        ...(dto.remindAt !== undefined && { remindAt: dto.remindAt ? new Date(dto.remindAt) : null }),
      },
    });
    this.rt.broadcast('client:update', { id: c.id });
    return c;
  }

  @Post(':id/notes')
  async addNote(@Param('id') id: string, @Body() dto: NoteDto, @CurrentUser() user: AuthUser) {
    const note = await this.prisma.clientNote.create({
      data: {
        clientId: id,
        text: dto.text,
        authorName: user.name,
        authorRole: user.role,
        authorEmpId: user.role === 'employee' ? user.sub : null,
      },
    });
    this.rt.broadcast('client:update', { id });
    return note;
  }

  @Post(':id/payments')
  async addPayment(@Param('id') id: string, @Body() dto: PaymentDto, @CurrentUser() user: AuthUser) {
    const pay = await this.prisma.payment.create({
      data: {
        clientId: id,
        amount: dto.amount,
        authorName: user.name,
        authorRole: user.role,
        authorEmpId: user.role === 'employee' ? user.sub : null,
      },
    });
    // Recompute sale completion
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (client && client.saleTotalAmount && client.saleStatus !== 'none') {
      const total = client.payments.reduce((s, p) => s + p.amount, 0);
      if (total >= client.saleTotalAmount) {
        await this.prisma.client.update({
          where: { id },
          data: {
            saleStatus: 'full',
            completedAt: new Date(),
            completedByName: user.name,
            completedByRole: user.role,
            stage: 'sold',
          },
        });
      }
    }
    this.rt.broadcast('client:update', { id });
    return pay;
  }

  @Patch(':id/sale')
  async setSale(@Param('id') id: string, @Body() dto: SaleSetupDto) {
    const c = await this.prisma.client.update({
      where: { id },
      data: {
        saleStatus: dto.status,
        ...(dto.totalAmount !== undefined && { saleTotalAmount: dto.totalAmount }),
        ...(dto.nextPaymentAt !== undefined && { nextPaymentAt: dto.nextPaymentAt ? new Date(dto.nextPaymentAt) : null }),
        ...(dto.status !== 'none' && { soldAt: new Date(), stage: 'sold' as ClientStage }),
        ...(dto.status === 'partial' && { telegramReminderSentAt: null }),
      },
    });
    this.rt.broadcast('client:update', { id: c.id });
    return c;
  }
}
