#!/usr/bin/env python3
"""Extract explicitly published contact records from allowlisted Common Crawl pages."""

from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

CC_INDEXES = "https://index.commoncrawl.org/collinfo.json"
CC_DATA = "https://data.commoncrawl.org/"
EMAIL_RE = re.compile(r"^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.I)
NAME_RE = re.compile(r"^[A-Z][\w'.-]+(?:\s+[A-Z][\w'.-]+){1,4}$", re.UNICODE)


def args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--domains", required=True, help="Text file containing one permitted domain per line")
    parser.add_argument("--output", required=True, help="Output NDJSON file")
    parser.add_argument("--crawl", help="Common Crawl index id; defaults to the newest available index")
    parser.add_argument("--max-pages", type=int, default=100, help="Maximum captures per domain")
    return parser.parse_args()


def newest_index(session: requests.Session) -> str:
    response = session.get(CC_INDEXES, timeout=30)
    response.raise_for_status()
    return response.json()[0]["id"]


def load_domains(path: str) -> list[str]:
    domains: list[str] = []
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        value = raw.strip().lower().removeprefix("https://").removeprefix("http://").strip("/")
        if value and not value.startswith("#") and re.fullmatch(r"[a-z0-9.-]+", value):
            domains.append(value)
    if not domains:
        raise ValueError("The domain allowlist is empty")
    return sorted(set(domains))


def captures(session: requests.Session, crawl: str, domain: str, limit: int):
    endpoint = f"https://index.commoncrawl.org/{crawl}-index"
    response = session.get(endpoint, params={
        "url": f"{domain}/*", "output": "json", "filter": ["status:200", "mime:text/html"],
        "collapse": "urlkey", "limit": str(limit),
    }, timeout=60)
    response.raise_for_status()
    for line in response.text.splitlines():
        if line.strip():
            yield json.loads(line)


def fetch_html(session: requests.Session, capture: dict) -> str | None:
    offset = int(capture["offset"])
    length = int(capture["length"])
    response = session.get(
        CC_DATA + capture["filename"],
        headers={"Range": f"bytes={offset}-{offset + length - 1}"},
        timeout=60,
    )
    if response.status_code not in (200, 206):
        return None
    try:
        payload = gzip.decompress(response.content)
    except gzip.BadGzipFile:
        payload = response.content
    marker = payload.find(b"\r\n\r\n", payload.find(b"WARC/"))
    if marker < 0:
        return None
    http_marker = payload.find(b"\r\n\r\n", marker + 4)
    if http_marker < 0:
        return None
    return payload[http_marker + 4 :].decode("utf-8", errors="replace")


def jsonld_objects(value):
    if isinstance(value, list):
        for item in value:
            yield from jsonld_objects(item)
    elif isinstance(value, dict):
        graph = value.get("@graph")
        if graph:
            yield from jsonld_objects(graph)
        yield value


def clean_email(value) -> str | None:
    if not isinstance(value, str):
        return None
    candidate = value.strip().removeprefix("mailto:").split("?")[0].lower()
    return candidate if EMAIL_RE.fullmatch(candidate) else None


def extract(html: str, source_url: str, domain: str):
    soup = BeautifulSoup(html, "html.parser")
    organization = None
    objects: list[dict] = []
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            objects.extend(item for item in jsonld_objects(json.loads(script.string or "")) if isinstance(item, dict))
        except (json.JSONDecodeError, TypeError):
            continue
    for item in objects:
        kind = item.get("@type")
        kinds = kind if isinstance(kind, list) else [kind]
        if "Organization" in kinds and isinstance(item.get("name"), str):
            organization = item["name"].strip()
            break
    for item in objects:
        kind = item.get("@type")
        kinds = kind if isinstance(kind, list) else [kind]
        name = str(item.get("name", "")).strip()
        if "Person" not in kinds or not NAME_RE.fullmatch(name):
            continue
        works_for = item.get("worksFor")
        company = works_for.get("name") if isinstance(works_for, dict) else organization
        company = str(company or organization or domain).strip()
        email = clean_email(item.get("email"))
        yield {
            "full_name": name,
            "job_title": item.get("jobTitle"),
            "company_name": company,
            "company_domain": domain,
            "public_email": email,
            "source_url": source_url,
        }


def main() -> int:
    config = args()
    session = requests.Session()
    session.headers["User-Agent"] = "ReachIQOpenDataImporter/1.0 (provenance-preserving research crawler)"
    crawl = config.crawl or newest_index(session)
    domains = load_domains(config.domains)
    written = 0
    seen: set[tuple[str, str]] = set()
    with Path(config.output).open("w", encoding="utf-8") as output:
        for domain in domains:
            print(f"Indexing {domain} from {crawl}", file=sys.stderr)
            for capture in captures(session, crawl, domain, config.max_pages):
                source_url = capture.get("url", "")
                host = urlparse(source_url).hostname or ""
                if host != domain and not host.endswith("." + domain):
                    continue
                html = fetch_html(session, capture)
                if not html:
                    continue
                for row in extract(html, source_url, domain):
                    key = (row["full_name"].lower(), row["source_url"])
                    if key in seen:
                        continue
                    seen.add(key)
                    output.write(json.dumps(row, ensure_ascii=False) + "\n")
                    written += 1
    print(f"Wrote {written} provenance-backed contacts to {config.output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
