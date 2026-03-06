-- CreateEnum
CREATE TYPE "SavedFilterKind" AS ENUM ('HISTORY', 'STOCK');

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "SavedFilterKind" NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedFilter_userId_idx" ON "SavedFilter"("userId");

-- CreateIndex
CREATE INDEX "SavedFilter_kind_idx" ON "SavedFilter"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "SavedFilter_userId_kind_name_key" ON "SavedFilter"("userId", "kind", "name");

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
