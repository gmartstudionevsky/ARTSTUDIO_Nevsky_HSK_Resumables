-- CreateEnum
CREATE TYPE "SettingKey" AS ENUM (
  'SUPERVISOR_BACKDATE_DAYS',
  'REQUIRE_REASON_ON_CANCEL',
  'ALLOW_NEGATIVE_STOCK',
  'DISPLAY_DECIMALS',
  'ENABLE_PERIOD_LOCKS'
);

-- CreateTable
CREATE TABLE "AppSetting" (
  "id" UUID NOT NULL,
  "key" "SettingKey" NOT NULL,
  "valueJson" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedById" UUID,

  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodLock" (
  "id" UUID NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "isLocked" BOOLEAN NOT NULL DEFAULT true,
  "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedById" UUID NOT NULL,
  "note" TEXT,

  CONSTRAINT "PeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodLock_year_month_key" ON "PeriodLock"("year", "month");

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodLock" ADD CONSTRAINT "PeriodLock_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
