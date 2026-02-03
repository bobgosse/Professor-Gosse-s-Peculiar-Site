-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "IntExt" AS ENUM ('INT', 'EXT');

-- CreateEnum
CREATE TYPE "DayNight" AS ENUM ('DAY', 'NIGHT', 'DUSK', 'DAWN', 'DAY_FOR_NIGHT');

-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('TRAVEL', 'MOVE', 'HOLIDAY', 'PRERIG', 'INFO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "director" TEXT,
    "producer" TEXT,
    "ad" TEXT,
    "scriptDate" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "actor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakdownSheet" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sceneNumbers" TEXT NOT NULL,
    "intExt" "IntExt",
    "location" TEXT,
    "dayNight" "DayNight",
    "pageCount" TEXT,
    "description" TEXT,
    "storyDay" INTEGER,
    "isFlashback" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stunts" TEXT,
    "extras" TEXT,
    "wardrobe" TEXT,
    "props" TEXT,
    "setDressing" TEXT,
    "artDept" TEXT,
    "specialPersonnel" TEXT,
    "vehicles" TEXT,
    "camera" TEXT,
    "mechanicalFx" TEXT,
    "visualFx" TEXT,
    "specialEquip" TEXT,
    "animals" TEXT,
    "soundMusic" TEXT,
    "other" TEXT,
    "dqs" TEXT,

    CONSTRAINT "BreakdownSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakdownCast" (
    "id" TEXT NOT NULL,
    "breakdownId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "BreakdownCast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripSlot" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "breakdownId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "StripSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayBreak" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "afterPosition" INTEGER NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "shootDate" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "DayBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerStrip" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "afterPosition" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "bannerType" "BannerType" NOT NULL,

    CONSTRAINT "BannerStrip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_projectId_number_key" ON "Character"("projectId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "BreakdownCast_breakdownId_characterId_key" ON "BreakdownCast"("breakdownId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_projectId_key" ON "Schedule"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StripSlot_breakdownId_key" ON "StripSlot"("breakdownId");

-- CreateIndex
CREATE INDEX "StripSlot_scheduleId_position_idx" ON "StripSlot"("scheduleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DayBreak_scheduleId_afterPosition_key" ON "DayBreak"("scheduleId", "afterPosition");

-- CreateIndex
CREATE INDEX "BannerStrip_scheduleId_afterPosition_idx" ON "BannerStrip"("scheduleId", "afterPosition");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownSheet" ADD CONSTRAINT "BreakdownSheet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownCast" ADD CONSTRAINT "BreakdownCast_breakdownId_fkey" FOREIGN KEY ("breakdownId") REFERENCES "BreakdownSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownCast" ADD CONSTRAINT "BreakdownCast_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripSlot" ADD CONSTRAINT "StripSlot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripSlot" ADD CONSTRAINT "StripSlot_breakdownId_fkey" FOREIGN KEY ("breakdownId") REFERENCES "BreakdownSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayBreak" ADD CONSTRAINT "DayBreak_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerStrip" ADD CONSTRAINT "BannerStrip_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
