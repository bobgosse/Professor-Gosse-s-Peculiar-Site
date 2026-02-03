-- CreateEnum
CREATE TYPE "ElementCategory" AS ENUM ('WARDROBE', 'PROPS', 'SET_DRESSING', 'ART_DEPT', 'SPECIAL_PERSONNEL', 'VEHICLES', 'CAMERA', 'MECHANICAL_FX', 'VISUAL_FX', 'SPECIAL_EQUIP', 'ANIMALS', 'SOUND_MUSIC', 'OTHER');

-- CreateTable
CREATE TABLE "ProductionElement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "ElementCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakdownElement" (
    "id" TEXT NOT NULL,
    "breakdownId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,

    CONSTRAINT "BreakdownElement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionElement_projectId_category_name_key" ON "ProductionElement"("projectId", "category", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BreakdownElement_breakdownId_elementId_key" ON "BreakdownElement"("breakdownId", "elementId");

-- AddForeignKey
ALTER TABLE "ProductionElement" ADD CONSTRAINT "ProductionElement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownElement" ADD CONSTRAINT "BreakdownElement_breakdownId_fkey" FOREIGN KEY ("breakdownId") REFERENCES "BreakdownSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownElement" ADD CONSTRAINT "BreakdownElement_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "ProductionElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
