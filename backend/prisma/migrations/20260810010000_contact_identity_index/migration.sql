ALTER TABLE "Contact"
  ADD COLUMN "canonicalKey" TEXT,
  ADD COLUMN "sourceCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "emailAvailability" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Contact_canonicalKey_key" ON "Contact"("canonicalKey");

CREATE TABLE "ContactSourceEvidence" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactSourceEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContactSourceEvidence_contactId_sourceUrl_key" ON "ContactSourceEvidence"("contactId", "sourceUrl");
CREATE INDEX "ContactSourceEvidence_sourceType_lastSeenAt_idx" ON "ContactSourceEvidence"("sourceType", "lastSeenAt");
ALTER TABLE "ContactSourceEvidence" ADD CONSTRAINT "ContactSourceEvidence_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
