import { searchAllPages, searchDeveloperDocs, AlgoliaHit } from "../api/algolia";
import { WidgetFunctionConfig } from "../types";

export const searchAlgolia: WidgetFunctionConfig = {
  id: 'search_algolia',
  config: {
    name: 'search_algolia',
    description: `Search our docs and marketing sites using Algolia to find the most relevant page for answering user queries.
    
## Search instructions

- Always hyphenate speech-to-text and text-to-speech when searching for documentation.
- Always use "speech-to-text" and "voice agent" when searching for documentation on these topics.
- Use the 

## Search examples

- "getting started text-to-speech"
- "getting started speech-to-text"
- "getting started voice agent"
- "getting started text intelligence"
- "getting started audio intelligence"
`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant content on our websites',
        },
        search_type: {
          type: 'string',
          description: 'MUST be "docs" for specific documentation requests, "all" for all pages',
        },
      },
      required: ['query', 'search_type'],
    },
  },
  function: async (input: Record<string, unknown>) => {
    const { query, search_type } = input as { query: string; search_type: 'webpage' | 'docs' | 'all' };

    let results: AlgoliaHit[];
    switch (search_type) {
      case 'docs':
        results = await searchDeveloperDocs(query);
        break;
      default:
        results = await searchAllPages(query);
      }

      return results;
  },
};

        