import { getRecordsByUrl } from "../api/algolia";
import { WidgetFunctionConfig } from "../types";

export const grokPage: WidgetFunctionConfig = {
  id: 'grok_page',
  config: {
    name: 'grok_page',
    description: 'Help the user understand the current page on the website',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  function: async (_: Record<string, unknown>) => {
    const url = new URL(window.location.href);
    return getRecordsByUrl(url.searchParams.get('url') || window.location.href);
  },
};