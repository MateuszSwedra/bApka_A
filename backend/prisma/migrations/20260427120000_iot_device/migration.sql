-- Extend LogSource enum (idempotent)
DO $$ BEGIN
  ALTER TYPE "LogSource" ADD VALUE 'DEVICE_ESP32';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT,
    "caretakerId" TEXT NOT NULL,
    "dependentUserId" TEXT NOT NULL,
    "secretHash" TEXT,
    "claimTokenHash" TEXT,
    "claimTokenExpiresAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "wifiConfigured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceEvent" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "clientEventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_publicId_key" ON "Device"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_dependentUserId_key" ON "Device"("dependentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_secretHash_key" ON "Device"("secretHash");

-- CreateIndex
CREATE UNIQUE INDEX "Device_claimTokenHash_key" ON "Device"("claimTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceEvent_deviceId_clientEventId_key" ON "DeviceEvent"("deviceId", "clientEventId");

-- CreateIndex
CREATE INDEX "DeviceEvent_deviceId_createdAt_idx" ON "DeviceEvent"("deviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_caretakerId_fkey" FOREIGN KEY ("caretakerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_dependentUserId_fkey" FOREIGN KEY ("dependentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceEvent" ADD CONSTRAINT "DeviceEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
