import { CompanySiteIngestionSource } from './ingestion/company-site.source';
import { DirectoryCrawlProgressService } from './ingestion/directories/directory-crawl-progress.service';
import { DirectoryIngestionSource } from './ingestion/directories/directory.source';
import { yellowPagesDefinition } from './ingestion/directories/yellow-pages.definition';
import { OverpassPlacesIngestionSource } from './ingestion/overpass-places.source';
import { ProxiedHttpClient } from './ingestion/proxied-http-client';
import { SearxngSearchIngestionSource } from './ingestion/searxng-search.source';
import { IngestionOrchestrator } from './ingestion-orchestrator.service';

export function createIngestionOrchestrator(): IngestionOrchestrator {
  const http = new ProxiedHttpClient();
  const progress = new DirectoryCrawlProgressService();

  const directories = [new DirectoryIngestionSource(yellowPagesDefinition, http, progress)];
  const places = new OverpassPlacesIngestionSource();
  const companySite = new CompanySiteIngestionSource(http);
  const searchEngine = new SearxngSearchIngestionSource();

  return new IngestionOrchestrator(directories, places, companySite, searchEngine);
}
