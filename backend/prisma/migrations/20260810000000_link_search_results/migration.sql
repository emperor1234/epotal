CREATE TABLE "SearchResult" (
    "searchQueryId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("searchQueryId", "contactId")
);

CREATE INDEX "SearchResult_contactId_idx" ON "SearchResult"("contactId");

ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_searchQueryId_fkey"
FOREIGN KEY ("searchQueryId") REFERENCES "SearchQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
