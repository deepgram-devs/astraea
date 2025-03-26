import { Component, h, Prop, State, Watch } from '@stencil/core';
import '@deepgram/browser-agent';
import { customAlphabet } from 'nanoid';
interface AudioConfig {
  input: {
    encoding: string;
    sample_rate: number;
  };
  output: {
    encoding: string;
    sample_rate: number;
    container?: string;
    buffer_size?: number;
  };
}

interface AgentConfig {
  listen: { model: string };
  speak: {
    model: string;
    temp?: number;
    rep_penalty?: number;
  };
  think: {
    provider: { type: string; fallback_to_groq?: boolean };
    model: string;
    instructions: string;
    functions?: LlmFunction[];
  };
}

interface ContextConfig {
  messages: { role: string; content: string }[];
  replay: boolean;
}

interface StsConfig {
  type: string;
  audio: AudioConfig;
  agent: AgentConfig;
  context?: ContextConfig;
  language?: string;
}

interface LlmFunction {
  name: string;
  description: string;
  url?: string;
  method?: string;
  headers?: Header[];
  key?: string;
  parameters: LlmParameterObject | Record<string, never>;
}

type LlmParameter = LlmParameterScalar | LlmParameterObject;

interface LlmParameterBase {
  type: string;
  description?: string;
}

interface LlmParameterObject extends LlmParameterBase {
  type: 'object';
  properties: Record<string, LlmParameter>;
  required?: string[];
}

interface LlmParameterScalar extends LlmParameterBase {
  type: 'string' | 'integer';
}

interface Header {
  key: string;
  value: string;
}

const audioConfig: AudioConfig = {
  input: {
    encoding: 'linear16',
    sample_rate: 48000,
  },
  output: {
    encoding: 'linear16',
    sample_rate: 48000,
    container: 'none',
  },
};

const baseConfig = {
  type: 'SettingsConfiguration',
  audio: audioConfig,
  agent: {
    listen: { model: 'nova-3' },
    speak: { model: 'aura-asteria-en' },
    think: {
      provider: { type: 'open_ai' },
      model: 'gpt-4o',
    },
  },
};

const stsConfig: StsConfig = {
  ...baseConfig,
  agent: {
    ...baseConfig.agent,
    think: {
      ...baseConfig.agent.think,
      provider: { type: 'open_ai' },
      instructions: `
## Base instructions

You are a helpful voice assistant made by Deepgram's engineers.
Respond in a friendly, human, conversational manner.
YOU MUST answer in 1-2 sentences at most when the message is not empty.
Always reply to empty messages with an empty message.
Ask follow up questions.
Ask one question at a time.
Your messages should have no more than than 120 characters.
Do not use abbreviations for units.
Separate all items in a list with commas.
Keep responses unique and free of repetition.
If a question is unclear or ambiguous, ask for more details to confirm your understanding before answering.
If someone asks how you are, or how you are feeling, tell them.
Deepgram gave you a mouth and ears so you can take voice as an input. You can listen and speak.
Your name is Voicebot.

## Search instructions

Always hyphenate speech-to-text and text-to-speech when searching for documentation.

## Search examples

- "How do I use speech-to-text?"
- "How do I use text-to-speech?"
                `,
      functions: [
        // search algolia
        {
          name: 'search_documentation',
          description:
            'Search the documentation using Algolia to find the most relevant pages for answering user queries',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query to find relevant documentation pages',
              },
              search_type: {
                type: 'string',
                description:
                  'Type of search to perform: "docs" for specific documentation requests, "all" for all pages',
              },
            },
            required: ['query', 'search_type'],
          },
        },
        // change to a URL
        {
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
      ],
    },
  },
  context: {
    messages: [
      {
        content: 'Hello, how can I help you?',
        role: 'assistant',
      },
    ],
    replay: true,
  },
};

type ConversationHistory = ConversationHistoryItem[];

/*
  Generate a unique alphanumeric string 
*/
const createIdGenerator = ({
  prefix,
  size: defaultSize = 16,
  alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  separator = '-',
}: {
  prefix?: string;
  separator?: string;
  size?: number;
  alphabet?: string;
} = {}): ((size?: number) => string) => {
  const generator = customAlphabet(alphabet, defaultSize);

  if (prefix == null) {
    return generator;
  }

  // check that the prefix is not part of the alphabet (otherwise prefix checking can fail randomly)
  if (alphabet.includes(separator)) {
    throw new Error(`The separator "${separator}" must not be part of the alphabet "${alphabet}".`);
  }

  return size => `${prefix}${separator}${generator(size)}`;
};

const generateId = createIdGenerator();

interface ConversationHistoryItem {
  id: string;
  content: string;
  role: string;
}

interface StructuredMessage {
  type: string;
  [key: string]: unknown;
}

interface FunctionCallRequest extends StructuredMessage {
  type: 'FunctionCallRequest';
  function_name: string;
  function_call_id: string;
  input: Record<string, unknown>;
}

interface ConversationText extends StructuredMessage {
  type: 'ConversationText';
  content: string;
  role: string;
}

interface AlgoliaHit {
  objectID: string;
  content: string;
  [key: string]: any; // Other dynamic fields
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
  params: string;
}

interface SearchOptions {
  query: string;
  attributesToRetrieve: string[];
  hitsPerPage: number;
}

interface AdditionalOptions {
  [key: string]: any;
}

@Component({
  tag: 'deepgram-widget',
  styleUrl: 'deepgram-widget.css',
  shadow: true,
})
export class DeepgramWidget {
  @Prop() clientToken: string;

  @State() termsOpen = false;

  agentElement!: HTMLElement;

  @State() connected = false;

  @State() conversationHistory: ConversationHistory = (() => {
    const urlHash = window.location.hash;
    if (urlHash === '#redirected-by-agent') {
      window.location.hash = ''; // Remove the anchor after the history has been updated
      return JSON.parse(localStorage.getItem('conversationHistory') || '[]');
    }
    return [];
  })();

  @Watch('conversationHistory')
  conversationHistoryChanged(newValue: ConversationHistory) {
    localStorage.setItem('conversationHistory', JSON.stringify(newValue));
  }

  @State() currentMessageId: string = generateId();

  @State() typingStates: { [key: string]: string } = {};
  @State() isTyping: { [key: string]: boolean } = {};

  toggleTerms() {
    this.termsOpen = !this.termsOpen;
  }

  isTermsOpen() {
    return this.termsOpen;
  }

  private truncateContent(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + '...';
  }

  private async baseSearchDocumentation(
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

    // Truncate the content field in each hit
    const truncatedHits = data.hits.map(hit => ({
      ...hit,
      content: hit.content ? this.truncateContent(hit.content) : hit.content,
    }));

    console.log(truncatedHits);

    return truncatedHits;
  }

  private async searchDeveloperDocs(query: string): Promise<AlgoliaHit[]> {
    return this.baseSearchDocumentation(query, 5, {
      attributesToRetrieve: ['*'],
      attributesToSnippet: ['*:50'],
      facetFilters: [['hierarchy.lvl0:API Reference', 'hierarchy.lvl0:Docs']],
      facets: ['*'],
      filters: 'type:content AND NOT content:null',
      getRankingInfo: true,
      maxValuesPerFacet: 100,
      responseFields: ['*'],
      snippetEllipsisText: '…',
    });
  }

  private async searchAllPages(query: string): Promise<AlgoliaHit[]> {
    return this.baseSearchDocumentation(query, 5);
  }

  connectAgent() {
    console.log(this.agentElement);
    // @ts-expect-error Shhh
    this.agentElement.apiKey = 'b3693f5baa02987629f72b69e6c7b3a15c51c1f8';

    this.agentElement.setAttribute('config', JSON.stringify(stsConfig));
    console.log(this.agentElement);
    this.connected = true;
  }

  disconnectAgent() {
    this.connected = false;
    this.agentElement.removeAttribute('config');
    console.log(this.connected);
  }

  // Random delay between 40-100ms for more natural typing
  typingDelay = () => 40 + Math.random() * 60;

  private async typeMessage(messageId: string, finalContent: string) {
    if (!this.isTyping[messageId]) {
      this.isTyping[messageId] = true;
      const currentContent = this.typingStates[messageId] || '';

      for (let i = currentContent.length; i < finalContent.length; i++) {
        this.typingStates = {
          ...this.typingStates,
          [messageId]: finalContent.slice(0, i + 1),
        };
        await new Promise(resolve => setTimeout(resolve, this.typingDelay()));
      }

      this.isTyping[messageId] = false;
    }
  }

  conversationTextHandler(structuredMessage: StructuredMessage) {
    const conversationText = structuredMessage as ConversationText;

    // if the current message id is null, generate a new one
    if (this.currentMessageId == null) {
      this.currentMessageId = generateId();
    }

    // if the current message is not in the conversation history, add it
    if (!this.conversationHistory.some(message => message.id === this.currentMessageId)) {
      this.conversationHistory.push({
        id: this.currentMessageId,
        content: conversationText.content,
        role: conversationText.role,
      });
    }

    // on the off-chance that the role has changed, generate a new message id, and then treat it like a new message after changing the ID
    else if (
      this.conversationHistory.some(
        message => message.id === this.currentMessageId && message.role !== conversationText.role,
      )
    ) {
      this.currentMessageId = generateId();
      this.conversationHistory.push({
        id: this.currentMessageId,
        content: conversationText.content,
        role: conversationText.role,
      });
    }

    // if the current message ID is already the conversation history, append the new content to the existing message
    else if (this.conversationHistory.some(message => message.id === this.currentMessageId)) {
      const updatedConversationHistory = this.conversationHistory.map(message => {
        if (message.id === this.currentMessageId) {
          return {
            ...message,
            content: message.content + ' ' + conversationText.content,
          };
        }
        return message;
      });
      this.conversationHistory = updatedConversationHistory;
      // force the dom redraw of the conversation history
      // this.conversationHistory = [...this.conversationHistory];
    }

    // After updating conversationHistory, start the typing animation
    const messageContent = conversationText.content;
    if (this.currentMessageId) {
      this.typeMessage(this.currentMessageId, messageContent);
    }
  }

  async functionCallRequestHandler(structuredMessage: StructuredMessage) {
    const functionCallRequest = structuredMessage as FunctionCallRequest;
    const { function_name, input } = functionCallRequest;
    if (function_name === 'search_documentation') {
      const { query, search_type } = input as { query: string; search_type: 'webpage' | 'docs' | 'all' };

      let results: AlgoliaHit[];
      switch (search_type) {
        case 'docs':
          results = await this.searchDeveloperDocs(query);
          break;
        default:
          results = await this.searchAllPages(query);
      }

      // @ts-expect-error Shhh
      this.agentElement.sendClientMessage(
        JSON.stringify({
          type: 'FunctionCallResponse',
          function_call_id: functionCallRequest.function_call_id,
          output: results,
        }),
      );
    } else if (function_name === 'change_url') {
      const { url } = input as { url: string };
      window.location.href = url;
    }
  }

  getCurrentMessage() {
    return this.conversationHistory.find(message => message.id === this.currentMessageId);
  }

  async structuredMessageHandler(data: any) {
    console.log(data);

    const structuredMessage = (data as any).detail as any as StructuredMessage;

    if (structuredMessage.type === 'ConversationText') {
      await this.conversationTextHandler(structuredMessage);
    }

    if (structuredMessage.type === 'FunctionCallRequest') {
      await this.functionCallRequestHandler(structuredMessage);
    }

    if (structuredMessage.type === 'EndOfThought') {
      this.currentMessageId = generateId();
    }

    // if (structuredMessage.type === 'AgentAudioDone') {
    //   this.currentMessageId = generateId();
    // }
  }

  componentDidLoad() {
    if (this.currentMessageId == null) {
      this.currentMessageId = generateId();
    }

    console.log('The component has been rendered');
    this.agentElement.addEventListener('no key', data => console.log(data));
    this.agentElement.addEventListener('no url', data => console.log(data));
    this.agentElement.addEventListener('no config', data => console.log(data));
    this.agentElement.addEventListener('empty audio', data => console.log(data));
    this.agentElement.addEventListener('socket open', data => console.log(data));
    this.agentElement.addEventListener('socket close', data => console.log(data));
    this.agentElement.addEventListener('connection timeout', data => console.log(data));
    this.agentElement.addEventListener('failed setup', data => console.log(data));
    this.agentElement.addEventListener('failed to connect user media', data => console.log(data));
    this.agentElement.addEventListener('unknown message', data => console.log(data));
    this.agentElement.addEventListener('structured message', async data => await this.structuredMessageHandler(data));
    this.agentElement.addEventListener('client message', data => console.log(data));
  }

  render() {
    return (
      <div class="dg-widget__container">
        <ul class="dg-widget__conversation">
          {this.conversationHistory.map((item, index) => (
            <li
              key={`dg-widget__conversation__item-${index}`}
              class={`dg-widget__conversation__item dg-widget__conversation__item--${item.role}`}
            >
              <div
                class={`dg-widget__conversation__item-content ${
                  item.id === this.currentMessageId ? 'current-item' : 'history-item'
                }`}
              >
                <p>
                  {item.id === this.currentMessageId ? this.typingStates[item.id] || '' : item.content}
                  {item.id === this.currentMessageId && this.isTyping[item.id] && <span class="cursor-blink">|</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div class="dg-widget__wrapper">
          <div class="dg-widget__powered-by">
            <span>Powered by Deepgram </span>
            <a href="https://deepgram.com">Voice Agent API</a>
          </div>
          <div class="dg-widget__box">
            <div class={`dg-widget__terms ${this.isTermsOpen() ? 'dg-widget__terms--open' : ''}`}>
              <h4 class="dg-widget__terms-header">Terms and conditions</h4>
              <p class="dg-widget__terms-content">
                By clicking "Agree," and each time I interact with this AI agent, I consent to Deepgram collecting and
                using my voice and data derived from it to interpret my speech, and provide the support services I
                request, and to the recording, storage, and sharing of my communications with third-party service
                providers, and as described in the{' '}
                <a href="https://deepgram.com/terms" target="_blank">
                  Privacy Policy
                </a>
                . If you do not wish to have your conversations recorded, please refrain from using this service.
              </p>
              <div class="dg-widget__terms-footer dg-widget__action-buttons">
                <button
                  class="dg-widget__button"
                  onClick={() => {
                    this.toggleTerms();
                    this.connectAgent();
                  }}
                >
                  Agree
                </button>
                <button class="dg-widget__button dg-widget__button--secondary" onClick={() => this.toggleTerms()}>
                  Cancel
                </button>
              </div>
            </div>
            <div class={`dg-widget__avatar ${this.isTermsOpen() ? 'dg-widget__avatar--closed' : ''}`}>
              <deepgram-agent
                ref={el => (this.agentElement = el)}
                id="dg-agent"
                url="wss://sts.sandbox.deepgram.com/agent"
                height="64"
                width="64"
                idle-timeout-ms="10000"
              ></deepgram-agent>
            </div>
            <div class={`dg-widget__actions ${this.isTermsOpen() ? 'dg-widget__actions--closed' : ''}`}>
              <div class="dg-widget__status">
                <span>Have a question?</span>
              </div>
              <div class="dg-widget__action-buttons">
                <button class="dg-widget__button" title="Voice agent" onClick={() => this.toggleTerms()}>
                  <svg
                    viewBox="0 0 640 640"
                    xmlns="http://www.w3.org/2000/svg"
                    stroke="currentColor"
                    fill="currentColor"
                  >
                    <path d="M 82.6 88.6 l 104 -24 c 11.3 -2.6 22.9 3.3 27.5 13.9 l 48 112 c 4.2 9.8 1.4 21.3 -6.9 28 l -60.6 49.6 c 36 76.7 98.9 140.5 177.2 177.2 l 49.6 -60.6 c 6.8 -8.3 18.2 -11.1 28 -6.9 l 112 48 C 572.1 430.5 578 442.1 575.4 453.4 l -24 104 C 548.9 568.2 539.3 576 528 576 c -256.1 0 -464 -207.5 -464 -464 c 0 -11.2 7.7 -20.9 18.6 -23.4 z"></path>
                  </svg>
                  <span>Ask our agent</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
