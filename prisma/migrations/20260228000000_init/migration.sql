-- Initial baseline schema for core inventory domain

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERVISOR', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('IN', 'OUT', 'ADJUST', 'OPENING', 'INVENTORY_APPLY');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('DRAFT', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UiTextScope" AS ENUM ('BOTH', 'WEB', 'MOBILE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdById" UUID,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseArticle" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExpenseArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purpose" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Purpose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reason" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UiText" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "ruText" TEXT NOT NULL,
    "scope" "UiTextScope" NOT NULL DEFAULT 'BOTH',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UiText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "defaultExpenseArticleId" UUID NOT NULL,
    "defaultPurposeId" UUID NOT NULL,
    "minQtyBase" DECIMAL(18,6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "synonyms" TEXT,
    "note" TEXT,
    "baseUnitId" UUID NOT NULL,
    "defaultInputUnitId" UUID NOT NULL,
    "reportUnitId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemUnit" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "factorToBase" DECIMAL(18,6) NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "isDefaultInput" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultReport" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "batchId" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "note" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" UUID,
    "reasonId" UUID,
    "cancelNote" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLine" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "qtyInput" DECIMAL(18,6) NOT NULL,
    "unitId" UUID NOT NULL,
    "qtyBase" DECIMAL(18,6) NOT NULL,
    "expenseArticleId" UUID NOT NULL,
    "purposeId" UUID NOT NULL,
    "comment" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" UUID,
    "reasonId" UUID,
    "cancelNote" TEXT,
    "correctedFromLineId" UUID,

    CONSTRAINT "TransactionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySession" (
    "id" UUID NOT NULL,
    "occurredAt" DATE NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "appliedById" UUID,
    "note" TEXT,

    CONSTRAINT "InventorySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLine" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "qtySystemBase" DECIMAL(18,6) NOT NULL,
    "qtyFactInput" DECIMAL(18,6),
    "qtyFactBase" DECIMAL(18,6),
    "deltaBase" DECIMAL(18,6),
    "apply" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,

    CONSTRAINT "InventoryLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" UUID,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseArticle_code_key" ON "ExpenseArticle"("code");

-- CreateIndex
CREATE INDEX "ExpenseArticle_code_idx" ON "ExpenseArticle"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Purpose_code_key" ON "Purpose"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Reason_code_key" ON "Reason"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UiText_key_key" ON "UiText"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");

-- CreateIndex
CREATE INDEX "Item_code_idx" ON "Item"("code");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemUnit_itemId_unitId_key" ON "ItemUnit"("itemId", "unitId");

-- CreateIndex
CREATE INDEX "Transaction_occurredAt_idx" ON "Transaction"("occurredAt");

-- CreateIndex
CREATE INDEX "TransactionLine_itemId_idx" ON "TransactionLine"("itemId");

-- CreateIndex
CREATE INDEX "TransactionLine_expenseArticleId_idx" ON "TransactionLine"("expenseArticleId");

-- CreateIndex
CREATE INDEX "TransactionLine_purposeId_idx" ON "TransactionLine"("purposeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_defaultExpenseArticleId_fkey" FOREIGN KEY ("defaultExpenseArticleId") REFERENCES "ExpenseArticle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_defaultPurposeId_fkey" FOREIGN KEY ("defaultPurposeId") REFERENCES "Purpose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_defaultInputUnitId_fkey" FOREIGN KEY ("defaultInputUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_reportUnitId_fkey" FOREIGN KEY ("reportUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemUnit" ADD CONSTRAINT "ItemUnit_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemUnit" ADD CONSTRAINT "ItemUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "Reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_expenseArticleId_fkey" FOREIGN KEY ("expenseArticleId") REFERENCES "ExpenseArticle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "Purpose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "Reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_correctedFromLineId_fkey" FOREIGN KEY ("correctedFromLineId") REFERENCES "TransactionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySession" ADD CONSTRAINT "InventorySession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySession" ADD CONSTRAINT "InventorySession_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InventorySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLine" ADD CONSTRAINT "InventoryLine_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
