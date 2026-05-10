import { Module, Logger, Injectable } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.module';
import { TelegramModule, TelegramService } from '../telegram/telegram.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';

const QUEUE = 'notifications';

interface TelegramReminderJob {
  type: 'telegram_payment_reminder';
  clientId: string;
}

@Injectable()
class CronService {
  private readonly logger = new Logger('Cron');
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE) private queue: Queue,
    private rt: RealtimeGateway,
  ) {}

  // Every minute scan for due-soon payments and emit reminders
  @Cron(CronExpression.EVERY_MINUTE)
  async scanReminders() {
    const lead = parseInt(process.env.TELEGRAM_REMINDER_LEAD_MINUTES || '60', 10);
    const now = new Date();
    const upper = new Date(now.getTime() + lead * 60_000);

    // Telegram pre-reminders (lead minutes before due, send once)
    const due = await this.prisma.client.findMany({
      where: {
        saleStatus: 'partial',
        nextPaymentAt: { lte: upper, gt: now },
        telegramReminderSentAt: null,
        telegramChatId: { not: null },
      },
      take: 100,
    });
    for (const c of due) {
      await this.queue.add(
        'telegram_payment_reminder',
        { type: 'telegram_payment_reminder', clientId: c.id } satisfies TelegramReminderJob,
        { attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: true, removeOnFail: 100 },
      );
    }

    // In-app reminders for employees: client.remindAt or payment due now
    const remind = await this.prisma.client.findMany({
      where: {
        OR: [
          { remindAt: { lte: now, gt: new Date(now.getTime() - 65_000) } },
          { saleStatus: 'partial', nextPaymentAt: { lte: now, gt: new Date(now.getTime() - 65_000) } },
        ],
      },
      take: 200,
    });
    for (const c of remind) {
      this.rt.toRole('employee', 'reminder', { clientId: c.id });
    }
  }
}

@Processor(QUEUE)
class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger('Worker');
  constructor(private prisma: PrismaService, private tg: TelegramService, private rt: RealtimeGateway) {
    super();
  }
  async process(job: Job<TelegramReminderJob>) {
    if (job.data.type === 'telegram_payment_reminder') {
      const c = await this.prisma.client.findUnique({ where: { id: job.data.clientId } });
      if (!c?.telegramChatId || !c.nextPaymentAt) return;
      const name = (c.data as any)?.['Ism familya'] || (c.data as any)?.['Ism'] || 'Hurmatli mijoz';
      const dueStr = new Date(c.nextPaymentAt).toLocaleString('uz-UZ');
      const text = `🔔 <b>To'lov eslatmasi</b>\n\nHurmatli ${name}, ${dueStr} da to'lov muddati keladi.\nIltimos, to'lovni o'z vaqtida amalga oshiring. Rahmat!`;
      try {
        await this.tg.sendMessage(c.telegramChatId, text);
        await this.prisma.client.update({
          where: { id: c.id },
          data: { telegramReminderSentAt: new Date() },
        });
        this.rt.broadcast('client:update', { id: c.id });
      } catch (e) {
        this.logger.error(`Telegram send failed: ${(e as Error).message}`);
        throw e;
      }
    }
  }
}

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE }), TelegramModule, RealtimeModule],
  providers: [CronService, NotificationsProcessor],
  exports: [BullModule],
})
export class JobsModule {}
