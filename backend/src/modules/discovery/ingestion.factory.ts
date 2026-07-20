import { CompanySiteIngestionSource } from './ingestion/company-site.source';
import { DirectoryCrawlProgressService } from './ingestion/directories/directory-crawl-progress.service';
import { DirectoryIngestionSource } from './ingestion/directories/directory.source';
import { yellowPagesDefinition } from './ingestion/directories/yellow-pages.definition';
import { GoogleMapsIngestionSource } from './ingestion/google-maps.source';
import { GoogleSearchIngestionSource } from './ingestion/google-search.source';
import { ProxiedHttpClient } from './ingestion/proxied-http-client';
import { IngestionOrchestrator } from './ingestion-orchestrator.service';

export function createIngestionOrchestrator(): IngestionOrchestrator {
  const http = new ProxiedHttpClient();
  const progress = new DirectoryCrawlProgressService();

  const directories = [new DirectoryIngestionSource(yellowPagesDefinition, http, progress)];
  const googleMaps = new GoogleMapsIngestionSource(http);
  const companySite = new CompanySiteIngestionSource(http);
  const googleSearch = new GoogleSearchIngestionSource(http);

  return new IngestionOrchestrator(directories, googleMaps, companySite, googleSearch);
}
