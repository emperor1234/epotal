CREATE TABLE "DatasetImport" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "licenseUrl" TEXT NOT NULL,
  "licenseName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "processed" INTEGER NOT NULL DEFAULT 0,
  "imported" INTEGER NOT NULL DEFAULT 0,
  "rejected" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "DatasetImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanySourceEvidence" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "datasetImportId" TEXT,
  "sourceUrl" TEXT NOT NULL,
  "licenseUrl" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanySourceEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanySourceEvidence_companyId_sourceUrl_key" ON "CompanySourceEvidence"("companyId", "sourceUrl");
CREATE INDEX "CompanySourceEvidence_datasetImportId_idx" ON "CompanySourceEvidence"("datasetImportId");
ALTER TABLE "CompanySourceEvidence" ADD CONSTRAINT "CompanySourceEvidence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanySourceEvidence" ADD CONSTRAINT "CompanySourceEvidence_datasetImportId_fkey" FOREIGN KEY ("datasetImportId") REFERENCES "DatasetImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
