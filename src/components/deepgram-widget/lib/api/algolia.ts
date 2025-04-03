export interface AlgoliaHit {
  objectID: string;
  content: string;
  title: string;
  url: string;
  [key: string]: any; // Other dynamic fields
}

export interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
  params: string;
}

export interface SearchOptions {
  query: string;
  attributesToRetrieve: string[];
  hitsPerPage: number;
}

export interface AdditionalOptions {
  [key: string]: any;
}

async function baseSearchDocumentation(
  query: string,
  limit: number = 5,
  options?: AdditionalOptions,
): Promise<AlgoliaHit[]> {
  const ALGOLIA_APP_ID = 'SKG3CU3YQM';
  const ALGOLIA_INDEX_NAME = 'crawler_unified';
  const ALGOLIA_API_KEY = 'e50ef768d9ac1a2b80ac6101639df429';

  const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query`;

  const searchParams: SearchOptions & AdditionalOptions = {
    query: `${query}`,
    attributesToRetrieve: ['title', 'content', 'url'],
    hitsPerPage: limit,
    ...options,
  };

  console.log(JSON.stringify(searchParams));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Algolia-API-Key': ALGOLIA_API_KEY,
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
    },
    body: JSON.stringify(searchParams),
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status} - ${response.statusText}`);
  }

  const data: AlgoliaResponse = await response.json();

  return data.hits;
}

async function getRecordsByUrl(url: string): Promise<AlgoliaHit[]> {
  return baseSearchDocumentation("", 10, {
    attributesToRetrieve: ['*'],
    attributesToSnippet: ['content:1000', '*:50'],
    facetFilters: [[`url_without_anchor:${url}`]],
    facets: ['*'],
    filters: 'type:content AND NOT content:null',
    getRankingInfo: true,
    maxValuesPerFacet: 100,
    responseFields: ['*'],
    snippetEllipsisText: '…',
  });
}

async function searchDeveloperDocs(query: string): Promise<AlgoliaHit[]> {
  return baseSearchDocumentation(query, 5, {
    attributesToRetrieve: ['*'],
    attributesToSnippet: ['content:1000', '*:50'],
    facetFilters: [['hierarchy.lvl0:API Reference', 'hierarchy.lvl0:Docs']],
    facets: ['*'],
    filters: 'type:content AND NOT content:null',
    getRankingInfo: true,
    maxValuesPerFacet: 100,
    responseFields: ['*'],
    snippetEllipsisText: '…',
  });
}

async function searchAllPages(query: string): Promise<AlgoliaHit[]> {
  return baseSearchDocumentation(query, 5);
}

export { searchDeveloperDocs, searchAllPages, getRecordsByUrl };
