# ReachIQ open-data pipeline

This pipeline creates provenance-backed NDJSON records from public pages in
Common Crawl and feeds them through ReachIQ's existing streaming importer.
It does not scrape authenticated social networks, bypass access controls, or
infer private personal addresses.

## Important data-rights boundary

Common Crawl makes crawl files available, but it does not grant a blanket
commercial license to every captured page. Put only domains you are permitted
to process in `domains.txt`, retain every `source_url`, honor removals and the
ReachIQ suppression list, and obtain legal review before commercial use.

## Extract

```bash
cd data-pipeline
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp domains.example.txt domains.txt
# Edit domains.txt before running.
python common_crawl_contacts.py \
  --domains domains.txt \
  --output contacts.ndjson \
  --max-pages 100
```

The extractor intentionally accepts only JSON-LD `Person` records. This is a
high-precision starting point: names, titles, organizations, and explicitly
published emails remain tied to the page where they appeared.

## Import into ReachIQ

Build the backend, then run:

```bash
cd ../backend
npm run build
npm run ingest:dataset -- \
  --file ../data-pipeline/contacts.ndjson \
  --format ndjson \
  --name "Allowlisted Common Crawl pages" \
  --source "https://commoncrawl.org/" \
  --license-name "Source-site terms reviewed" \
  --license "https://commoncrawl.org/terms-of-use"
```

Published emails are name-matched, encrypted at rest, recorded with source
evidence, classified as personal/business, and still pass suppression checks
before reveal.

## OpenSearch foundation

`docker-compose.yml` starts a private OpenSearch node for the next stage of
the independent index. Do not expose port 9200 publicly with security disabled.
The current importer writes authoritative normalized records to PostgreSQL;
OpenSearch can later be populated as a disposable query index.
