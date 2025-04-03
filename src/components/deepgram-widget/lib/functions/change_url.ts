import { WidgetFunctionConfig } from "../types";

export const changeUrl: WidgetFunctionConfig = {
  id: 'change_url',
  config: {
    name: 'change_url',
    description: 'Change the URL of the page',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to change to. Must be a valid URL including protocol.',
        },
      },
      required: ['url'],
    },
  },
  function: async (input: Record<string, unknown>) => {
    const { url } = input as { url: string };
    window.location.href = `/index.html?url=${url}`; // testing
    // window.location.href = url;
  },
};