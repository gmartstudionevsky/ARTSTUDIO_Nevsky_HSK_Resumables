-- CreateEnum
CREATE TYPE "TelegramEventType" AS ENUM ('TX_CREATED', 'DIGEST_BELOW_MIN', 'DIGEST_ZERO');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('TX', 'DIGEST');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "TelegramChannel" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramRule" (
    "id" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "eventType" "TelegramEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "channelId" UUID,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramChannel_chatId_key" ON "TelegramChannel"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramRule_channelId_eventType_key" ON "TelegramRule"("channelId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_kind_entityId_channelId_key" ON "NotificationLog"("kind", "entityId", "channelId");

-- AddForeignKey
ALTER TABLE "TelegramRule" ADD CONSTRAINT "TelegramRule_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "TelegramChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "TelegramChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
