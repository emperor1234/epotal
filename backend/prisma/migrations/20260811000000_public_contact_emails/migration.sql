-- Store publicly published email addresses separately from inferred work
-- addresses, encrypted at rest and with their source provenance retained.
CREATE TABLE "ContactEmailEvidence" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "encryptedEmail" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unknown',
    "sourceUrl" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactEmailEvidence_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContactEmailEvidence"
ADD CONSTRAINT "ContactEmailEvidence_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ContactEmailEvidence_contactId_emailHash_key"
ON "ContactEmailEvidence"("contactId", "emailHash");

CREATE INDEX "ContactEmailEvidence_contactId_emailType_verificationStatus_idx"
ON "ContactEmailEvidence"("contactId", "emailType", "verificationStatus");

ALTER TABLE "ContactReveal"
ADD COLUMN "emailType" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN "sourceUrl" TEXT;
