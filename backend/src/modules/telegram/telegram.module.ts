import { Module, OnModuleInit, Logger } from '@nestjs/common';
import TelegramBot = require('node-telegram-bot-api');
import { PrismaService } from '@/prisma/prisma.module';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

class TelegramService implements OnModuleInit {
  private readonly logger = new Logger('Telegram');
  private bot: TelegramBot | null = null;
  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    if (!TOKEN) { this.logger.warn('TELEGRAM_BOT_TOKEN not set, bot disabled'); return; }
    this.bot = new TelegramBot(TOKEN, { polling: true });
    this.bot.onText(/\/start/, async (msg) => {
      const chat = msg.chat;
      try {
        await this.prisma.telegramSubscriber.upsert({
          where: { chatId: BigInt(chat.id) },
          update: { username: chat.username, firstName: chat.first_name, lastName: chat.last_name },
          create: {
            chatId: BigInt(chat.id),
            username: chat.username,
            firstName: chat.first_name,
            lastName: chat.last_name,
          },
        });
        await this.bot!.sendMessage(chat.id, `Salom ${chat.first_name || ''}! Siz to'lov eslatmalarini olishga ulandingiz.`);
      } catch (e) { this.logger.error(e); }
    });
    this.logger.log('Telegram bot started');
  }

  async sendMessage(chatId: number | bigint, text: string) {
    if (!this.bot) throw new Error('Telegram bot is not configured');
    return this.bot.sendMessage(Number(chatId), text, { parse_mode: 'HTML' });
  }

  async listSubscribers() {
    const list = await this.prisma.telegramSubscriber.findMany({ orderBy: { createdAt: 'desc' } });
    return list.map((s) => ({
      chatId: Number(s.chatId),
      username: s.username,
      firstName: s.firstName,
      lastName: s.lastName,
    }));
  }
}

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class SendDto {
  @IsInt() chatId!: number;
  @IsString() @IsNotEmpty() @MaxLength(4000) text!: string;
}

@UseGuards(JwtAuthGuard)
@Controller('telegram')
class TelegramController {
  constructor(private svc: TelegramService) {}
  @Get('subscribers')
  list() { return this.svc.listSubscribers(); }
  @Post('send')
  send(@Body() dto: SendDto) { return this.svc.sendMessage(dto.chatId, dto.text); }
}

@Module({
  providers: [TelegramService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}

export { TelegramService };
