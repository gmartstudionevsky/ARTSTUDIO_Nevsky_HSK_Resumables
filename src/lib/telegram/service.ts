import { NotificationKind, NotificationStatus, TelegramEventType } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { getStockList } from '@/lib/stock/query';
import { sendMessage } from '@/lib/telegram/client';
import { buildDigestMessage, buildTxCreatedMessage } from '@/lib/telegram/templates';

export async function getActiveChannelsWithRule(eventType: TelegramEventType) {
  return prisma.telegramChannel.findMany({
    where: {
      isActive: true,
      rules: {
        some: {
          eventType,
          isEnabled: true,
        },
      },
    },
    include: {
      rules: {
        where: { isEnabled: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

async function upsertLog(params: {
  kind: NotificationKind;
  entityId: string;
  channelId: string;
  status: NotificationStatus;
  error?: string;
}) {
  await prisma.notificationLog.upsert({
    where: {
      kind_entityId_channelId: {
        kind: params.kind,
        entityId: params.entityId,
        channelId: params.channelId,
      },
    },
    create: {
      kind: params.kind,
      entityId: params.entityId,
      channelId: params.channelId,
      status: params.status,
      error: params.error ?? null,
      sentAt: params.status === NotificationStatus.SENT ? new Date() : null,
    },
    update: {
      status: params.status,
      error: params.error ?? null,
      sentAt: params.status === NotificationStatus.SENT ? new Date() : null,
    },
  });
}

export async function sendTxCreated(transactionId: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.APP_URL;

  if (!botToken || !appUrl) {
    return;
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      createdBy: { select: { login: true } },
      lines: {
        where: { status: 'ACTIVE' },
        include: {
          item: { select: { name: true } },
          unit: { select: { name: true } },
          expenseArticle: { select: { code: true } },
          purpose: { select: { code: true } },
        },
      },
    },
  });

  if (!transaction) return;

  const channels = await getActiveChannelsWithRule(TelegramEventType.TX_CREATED);

  if (channels.length === 0) return;

  const text = buildTxCreatedMessage({
    type: transaction.type,
    occurredAt: transaction.occurredAt,
    login: transaction.createdBy.login,
    transactionId,
    appUrl,
    lines: transaction.lines.map((line) => ({
      itemName: line.item.name,
      qtyInput: line.qtyInput.toString(),
      unitName: line.unit.name,
      expenseArticleCode: line.expenseArticle.code,
      purposeCode: line.purpose.code,
    })),
  });

  for (const channel of channels) {
    const existing = await prisma.notificationLog.findUnique({
      where: {
        kind_entityId_channelId: {
          kind: NotificationKind.TX,
          entityId: transactionId,
          channelId: channel.id,
        },
      },
    });

    if (existing?.status === NotificationStatus.SENT) {
      continue;
    }

    try {
      await sendMessage({ chatId: channel.chatId, text });
      await upsertLog({ kind: NotificationKind.TX, entityId: transactionId, channelId: channel.id, status: NotificationStatus.SENT });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка отправки Telegram';
      console.error('[telegram] TX_CREATED failed', { transactionId, channelId: channel.id, error: message });
      await upsertLog({ kind: NotificationKind.TX, entityId: transactionId, channelId: channel.id, status: NotificationStatus.FAILED, error: message });
    }
  }
}

function resolveDigestDate(dateISO?: string): string {
  if (dateISO) return dateISO;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date());
}

export async function sendDigest(inputDateISO?: string): Promise<{ date: string; sent: number; failed: number }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.APP_URL;
  const dateISO = resolveDigestDate(inputDateISO);

  if (!botToken || !appUrl) {
    return { date: dateISO, sent: 0, failed: 0 };
  }

  const [belowMin, zero, channels] = await Promise.all([
    getStockList({ status: 'belowMin', active: 'true', limit: 20, offset: 0 }),
    getStockList({ status: 'zero', active: 'true', limit: 20, offset: 0 }),
    prisma.telegramChannel.findMany({
      where: {
        isActive: true,
        rules: {
          some: {
            isEnabled: true,
            eventType: { in: [TelegramEventType.DIGEST_BELOW_MIN, TelegramEventType.DIGEST_ZERO] },
          },
        },
      },
      include: {
        rules: {
          where: {
            isEnabled: true,
            eventType: { in: [TelegramEventType.DIGEST_BELOW_MIN, TelegramEventType.DIGEST_ZERO] },
          },
        },
      },
    }),
  ]);

  let sent = 0;
  let failed = 0;

  for (const channel of channels) {
    const includeBelowMin = channel.rules.some((rule) => rule.eventType === TelegramEventType.DIGEST_BELOW_MIN);
    const includeZero = channel.rules.some((rule) => rule.eventType === TelegramEventType.DIGEST_ZERO);

    if (!includeBelowMin && !includeZero) continue;

    const enabledEventTypes = [
      ...(includeBelowMin ? [TelegramEventType.DIGEST_BELOW_MIN] : []),
      ...(includeZero ? [TelegramEventType.DIGEST_ZERO] : []),
    ];

    const existingLogs = await prisma.notificationLog.findMany({
      where: {
        kind: NotificationKind.DIGEST,
        channelId: channel.id,
        entityId: { in: enabledEventTypes.map((eventType) => `${dateISO}:${eventType}`) },
      },
    });

    const alreadySentAll = enabledEventTypes.every((eventType) =>
      existingLogs.some((log) => log.entityId === `${dateISO}:${eventType}` && log.status === NotificationStatus.SENT),
    );

    if (alreadySentAll) {
      continue;
    }

    const text = buildDigestMessage({
      dateISO,
      appUrl,
      includeBelowMin,
      includeZero,
      belowMin: belowMin.items.map((item) => ({
        name: item.name,
        qtyReport: item.qtyReport,
        unitName: item.reportUnit.name,
        minQtyBase: item.minQtyBase,
      })),
      zero: zero.items.map((item) => ({
        name: item.name,
        qtyReport: item.qtyReport,
        unitName: item.reportUnit.name,
        minQtyBase: item.minQtyBase,
      })),
    });

    try {
      await sendMessage({ chatId: channel.chatId, text });
      for (const eventType of enabledEventTypes) {
        await upsertLog({
          kind: NotificationKind.DIGEST,
          entityId: `${dateISO}:${eventType}` ,
          channelId: channel.id,
          status: NotificationStatus.SENT,
        });
      }
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка отправки Telegram';
      console.error('[telegram] DIGEST failed', { dateISO, channelId: channel.id, error: message });
      for (const eventType of enabledEventTypes) {
        await upsertLog({
          kind: NotificationKind.DIGEST,
          entityId: `${dateISO}:${eventType}` ,
          channelId: channel.id,
          status: NotificationStatus.FAILED,
          error: message,
        });
      }
      failed += 1;
    }
  }

  return { date: dateISO, sent, failed };
}
