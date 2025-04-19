import { Component, h, Prop, State, Watch } from '@stencil/core';
import '@deepgram/browser-agent';
import {
  ConversationText,
  FunctionCallRequest,
  SettingsApplied,
  StructuredMessage,
  VoiceAgentServiceConfig,
} from './lib/types';
import {
  BASE_CONFIG,
  THINKING_MESSAGES,
  GREETING_MESSAGES,
  REDIRECTED_MESSAGES,
  REDIRECTING_MESSAGES,
  RECONNECT_MESSAGES,
  AGENT_CLOSED_STATUSES,
  AGENT_CONNECTED_STATUSES,
  AGENT_RECONNECT_STATUSES,
} from './lib/constants';
import { changeUrl, searchAlgolia, grokPage } from './lib/functions';
import { AlgoliaHit } from './lib/api/algolia';
import { getRandomString } from './lib/utils';

/**
 * The state of the agent.
 *
 * @see https://github.com/deepgram-devs/deepgram-widget
 */
enum AgentState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  DISCONNECTING = 'disconnecting',
}

/**
 * The events that can be emitted by the agent.
 *
 * @see https://github.com/deepgram/browser-agent
 */
enum AgentEvent {
  NO_KEY = 'no key',
  NO_URL = 'no url',
  NO_CONFIG = 'no config',
  EMPTY_AUDIO = 'empty audio',
  SOCKET_OPEN = 'socket open',
  SOCKET_CLOSE = 'socket close',
  TIMED_OUT = 'connection timeout',
  FAILED_SETUP = 'failed setup',
  MEDIA_ERROR = 'failed to connect user media',
  UNKNOWN_MESSAGE = 'unknown message',
  MESSAGE = 'structured message',
  CLIENT_MESSAGE = 'client message',
}

/**
 * The Deepgram Widget component.
 *
 * @see https://github.com/deepgram-devs/deepgram-widget
 */
@Component({
  tag: 'deepgram-widget',
  styleUrl: 'deepgram-widget.css',
  shadow: true,
})
export class DeepgramWidget {
  /**
   * The agent element.
   *
   * @see https://github.com/deepgram/browser-agent
   */
  agentElement!: HTMLElement;

  /**
   * The current config.
   */
  @State() config: VoiceAgentServiceConfig = {
    ...BASE_CONFIG,
    agent: {
      ...BASE_CONFIG.agent,
      think: {
        ...BASE_CONFIG.agent.think,
        provider: { type: 'open_ai' },
        instructions: `
---
services:
  - name: Transcription
    alternativeNames: ["Speech-to-text (STT)", "Automatic Speech Recognition (ASR)", "Audio Intelligence"]
    productUrl: "https://deepgram.com/product/speech-to-text"
    docsUrl: "https://developers.deepgram.com/docs/pre-recorded"
    apiUrl: "https://api.deepgram.com/v1/listen"
  - name: Live Transcription
    alternativeNames: ["Live Speech-to-text (STT)", "Live Automatic Speech Recognition (ASR)"]
    productUrl: "https://deepgram.com/product/speech-to-text"
    docsUrl: "https://developers.deepgram.com/docs/streaming"
    apiUrl: "wss://api.deepgram.com/v1/listen"
  - name: Text Intelligence
    alternativeNames: ["Text Summarization", "Text Sentiment Analysis"]
    productUrl: "https://developers.deepgram.com/docs/text-intelligence"
    docsUrl: "https://developers.deepgram.com/docs/text-intelligence"
    apiUrl: "https://api.deepgram.com/v1/read"
  - name: Text-to-speech
    alternativeNames: ["Text-to-speech (TTS)", "TTS Batch", "TTS REST"]
    productUrl: "https://deepgram.com/product/text-to-speech"
    docsUrl: "https://developers.deepgram.com/docs/tts-rest"
    apiUrl: "https://api.deepgram.com/v1/speak"
  - name: Live Text-to-speech
    alternativeNames: ["Live Text-to-speech (TTS)", "TTS Streaming"]
    productUrl: "https://deepgram.com/product/text-to-speech"
    docsUrl: "https://developers.deepgram.com/docs/tts-websocket"
    apiUrl: "wss://api.deepgram.com/v1/speak"
  - name: Voice Agent
    alternativeNames: ["Speech-to-speech (S2S)", "Live Speech-to-speech (S2S)"]
    productUrl: "https://deepgram.com/product/voice-agent-api"
    docsUrl: "https://developers.deepgram.com/docs/voice-agent"
    apiUrl: "wss://agent.deepgram.com/agent"
terms:
  - term: "Speech-to-Text"
    alternatives: ["ASR", "Automatic Speech Recognition", "Transcription", "Speech Recognition"]
  - term: "Live Speech-to-Text"
    alternatives: ["Streaming Transcription", "Live Transcription", "Real-time Transcription", "Streaming Transcription"]
  - term: "Voice Agent"
    alternatives: ["Voice Assistant", "Voicebot", "Speech-to-speech"]
docs:
  - title: "Getting Started with Voice Agent"
    content: "An introduction to using Deepgram's Voice Agent API to build interactive voice agents.\n\nIn this guide, you'll learn how to develop applications using Deepgram's Agent API. Visit the API Specification for more details on how to interact with this interface, view control messages available, and obtain examples for responses from Deepgram."
    url: "https://developers.deepgram.com/docs/voice-agent"
  - title: "Configure the Voice Agent"
    content: "Learn about the voice agent configuration options for the agent, and both input and output audio.\n\nTo configure the voice agent, you'll need to send a Settings Configuration message immediately after connection. Below is a detailed explanation of the configurations available."
    url: "https://developers.deepgram.com/docs/configure-voice-agent"
  - title: "Build A Function Call"
    content: "Learn how to build a Function Call to use with your Agent.\n\nThis guide walks you through how to build a simple function call for a demo application. Please refer to this code repository for the complete application code."
    url: "https://developers.deepgram.com/docs/build-a-function-call"
  - title: "Getting Started with Transcription"
    content: "An introduction to getting transcription data from pre-recorded audio files.\n\nThis guide will walk you through how to transcribe pre-recorded audio with the Deepgram API. We provide two scenarios to try: transcribe a remote file and transcribe a local file."
    url: "https://developers.deepgram.com/docs/pre-recorded-audio"
  - title: "Getting Started with Live Transcription"
    content: "An introduction to getting transcription data from live streaming audio in real time.\n\nIn this guide, you'll learn how to automatically transcribe live streaming audio in real time using Deepgram's SDKs, which are supported for use with the Deepgram API. (If you prefer not to use a Deepgram SDK, jump to the section Non-SDK Code Examples.)"
    url: "https://developers.deepgram.com/docs/live-streaming-audio"
  - title: "Getting Started with Text-to-Speech"
    content: "An introduction to using Deepgram's Aura Text-to-Speech REST API to convert text into audio.\n\nThis guide will walk you through how to turn text into speech with Deepgram's text-to-speech REST API."
    url: "https://developers.deepgram.com/docs/text-to-speech"
  - title: "Getting Started with Text Intelligence"
    content: "An introduction to using Deepgram's text intelligence features to analyze text using Deepgram SDKs.\n\nIn this guide, you'll learn how to analyze text using Deepgram's text intelligence features: Summarization, Topic Detection, Intent Recognition, and Sentiment Analysis. The code examples use Deepgram's SDKs."
    url: "https://developers.deepgram.com/docs/text-intelligence"
  - title: "Getting Started with Audio Intelligence"
    content: "An introduction to using Deepgram's audio intelligence features to analyze audio using Deepgram SDKs.\n\nIn this guide, you'll learn how to analyze audio using Deepgram's intelligence features: Summarization, Topic Detection, Intent Recognition, Entity Detection, and Sentiment Analysis. The code examples use Deepgram's SDKs."
    url: "https://developers.deepgram.com/docs/audio-intelligence"
  - title: "Available Text-to-Speech Voices"
    content: "A list of the available voices for Deepgram's Aura Text-to-Speech API.\n\nDeepgram offers a range of voices for its Aura text-to-speech API, each identified by a unique model name following the format [modelname]-[voicename]-[language]."
    url: "https://developers.deepgram.com/docs/tts-models"
  - title: "Available Speech-to-Text Models & Languages"
    content: "A complete overview of Deepgram's speech-to-text models and supported languages."
    url: "https://developers.deepgram.com/docs/speech-to-text-models"
  - title: "Endpointing & Interim Results With Live Streaming"
    content: "Learn how to use endpointing and interim results when transcribing live streaming audio with Deepgram.\n\nWhen using Deepgram to transcribe live streaming audio, two of the features you can use include endpointing and interim results.\n\nBoth of these features monitor incoming live streaming audio and can indicate the end of a type of processing, but they are used in very different ways: endpointing is used to signal the end of a spoken utterance, while interim results are used to provide partial transcriptions of the audio as it is processed."
    url: "https://developers.deepgram.com/docs/understand-endpointing-interim-results"
---

## Base instructions

- You are a helpful voice assistant made by Deepgram's engineers.
- Respond in a friendly, human, conversational manner.
- YOU MUST answer in 1-2 sentences at most when the message is not empty.
- Always reply to empty messages with an empty message.
- Ask follow up questions.
- Ask one question at a time.
- Your messages should have no more than than 120 characters.
- Do not use abbreviations for units.
- Separate all items in a list with commas.
- Keep responses unique and free of repetition.
- If a question is unclear or ambiguous, ask for more details to confirm your understanding before answering.
- If someone asks how you are, or how you are feeling, tell them.
- Deepgram gave you a mouth and ears so you can take voice as an input. You can listen and speak.
- Your name is Voicebot.
- NEVER leave a message unanswered.

## ${searchAlgolia.id} Instructions

- ALWAYS consider the docs you know about before searching.
- NEVER read out the URL, just confirm the page title for them.
- ALWAYS ask the user if they'd like to browse to the page.
- If someone asks for a guide on a product, they're after a 'getting started' guide.
`,
        functions: [searchAlgolia.config, changeUrl.config, grokPage.config],
      },
    },
    context: {
      messages: [],
      replay: false,
    },
  };

  /**
   * The agent client ID.
   */
  @Prop() agentClientId: string;

  /**
   * Whether the terms are open.
   */
  @State() termsOpen: boolean = false;

  /**
   * Whether the terms have been agreed to.
   */
  @State() termsAgreed: boolean = false;

  /**
   * Whether the agent has redirected the user.
   */
  @State() redirectedByAgent: boolean = false;

  /**
   * The current state of the agent.
   */
  @State() agentState: AgentState = AgentState.DISCONNECTED;

  /**
   * Called when the `config` state changes.
   *
   * @see https://stenciljs.com/docs/reactive-data#the-watch-decorator-watch
   */
  @Watch('config')
  watchConfig(newConfig: VoiceAgentServiceConfig): void {
    sessionStorage.setItem('deepgram-widget-config', JSON.stringify(newConfig));
  }

  /**
   * Called when the `config` state changes.
   *
   * @see https://stenciljs.com/docs/reactive-data#the-watch-decorator-watch
   */
  @Watch('termsAgreed')
  watchTermsAgreed(newTermsAgreed: boolean): void {
    sessionStorage.setItem('deepgram-widget-terms-agreed', JSON.stringify(newTermsAgreed));
  }

  /**
   * Called when the `redirectedByAgent` state changes.
   *
   * @see https://stenciljs.com/docs/reactive-data#the-watch-decorator-watch
   */
  @Watch('redirectedByAgent')
  watchRedirectedByAgent(newRedirectedByAgent: boolean): void {
    sessionStorage.setItem('deepgram-widget-redirected-by-agent', JSON.stringify(newRedirectedByAgent));
  }

  /**
   * Called just before the component is fully loaded and the first render() occurs.
   *
   * @see https://stenciljs.com/docs/component-lifecycle#componentwillload
   */
  componentWillLoad(): void {
    console.log('The component will render');
    const termsAgreed = JSON.parse(sessionStorage.getItem('deepgram-widget-terms-agreed'));
    const redirectedByAgent = JSON.parse(sessionStorage.getItem('deepgram-widget-redirected-by-agent'));
    const sessionConfig = JSON.parse(sessionStorage.getItem('deepgram-widget-config'));

    if (termsAgreed) {
      console.log('terms previously agreed');
      this.termsAgreed = termsAgreed;
    }

    if (redirectedByAgent) {
      console.log('redirected by agent, will restore session');
      this.redirectedByAgent = redirectedByAgent;
    }

    if (sessionConfig) {
      console.log('session config found, restoring the config from session');
      this.config = sessionConfig;
    }
  }

  /**
   * Called once just after the component is fully loaded and the first render() occurs.
   *
   * @see https://stenciljs.com/docs/component-lifecycle#componentdidload
   */
  componentDidLoad(): void {
    console.log('The component has been rendered');

    // Set up event listeners
    this.registerEventHandler(AgentEvent.NO_KEY, async data => await this.noKeyHandler(data));
    this.registerEventHandler(AgentEvent.NO_URL, async data => await this.noUrlHandler(data));
    this.registerEventHandler(AgentEvent.NO_CONFIG, async data => await this.noConfigHandler(data));
    this.registerEventHandler(AgentEvent.EMPTY_AUDIO, async data => await this.emptyAudioHandler(data));
    this.registerEventHandler(AgentEvent.SOCKET_OPEN, async data => await this.socketOpenHandler(data));
    this.registerEventHandler(AgentEvent.SOCKET_CLOSE, async data => await this.socketCloseHandler(data));
    this.registerEventHandler(AgentEvent.TIMED_OUT, async data => await this.connectionTimeoutHandler(data));
    this.registerEventHandler(AgentEvent.FAILED_SETUP, async data => await this.failedSetupHandler(data));
    this.registerEventHandler(AgentEvent.MEDIA_ERROR, async data => await this.failedToConnectUserMediaHandler(data));
    this.registerEventHandler(AgentEvent.UNKNOWN_MESSAGE, async data => await this.unknownMessageHandler(data));
    this.registerEventHandler(AgentEvent.MESSAGE, async data => await this.structuredMessageHandler(data));
    this.registerEventHandler(AgentEvent.CLIENT_MESSAGE, async data => await this.clientMessageHandler(data));
  }

  /**
   * Register an event handler for the agent.
   *
   * @param event - The event to listen for.
   * @param handler - The handler to call when the event is triggered.
   */
  registerEventHandler(event: AgentEvent, handler: (data: any) => Promise<void>): void {
    this.agentElement.addEventListener(event, async data => await handler(data));
  }

  /**
   * Handle the no key event.
   *
   * @param data - The data from the event.
   */
  async noKeyHandler(data: any): Promise<void> {
    console.log('no key', data);
  }

  /**
   * Handle the no url event.
   *
   * @param data - The data from the event.
   */
  async noUrlHandler(data: any): Promise<void> {
    console.log('no url', data);
  }

  /**
   * Handle the no config event.
   *
   * @param data - The data from the event.
   */
  async noConfigHandler(data: any): Promise<void> {
    console.log('no config', data);
  }

  /**
   * Handle the empty audio event.
   *
   * @param data - The data from the event.
   */
  async emptyAudioHandler(data: any): Promise<void> {
    console.log('empty audio', data);
  }

  /**
   * Handle the socket open event.
   *
   * @param data - The data from the event.
   */
  async socketOpenHandler(data: any): Promise<void> {
    console.log('socket open', data);

    this.agentState = AgentState.CONNECTED;
  }

  /**
   * Handle the socket close event.
   *
   * @param data - The data from the event.
   */
  async socketCloseHandler(data: any): Promise<void> {
    console.log('socket close', data);

    this.agentState = AgentState.DISCONNECTED;
  }

  /**
   * Handle the connection timeout event.
   *
   * @param data - The data from the event.
   */
  async connectionTimeoutHandler(data: any): Promise<void> {
    console.log('connection timeout', data);
  }

  /**
   * Handle the failed setup event.
   *
   * @param data - The data from the event.
   */
  async failedSetupHandler(data: any): Promise<void> {
    console.log('failed setup', data);
  }

  /**
   * Handle the failed to connect user media event.
   *
   * @param data - The data from the event.
   */
  async failedToConnectUserMediaHandler(data: any): Promise<void> {
    console.log('failed to connect user media', data);
  }

  /**
   * Handle the unknown message event.
   *
   * @param data - The data from the event.
   */
  async unknownMessageHandler(data: any): Promise<void> {
    console.log('unknown message', data);
  }

  /**
   * Handle the structured message event.
   *
   * @param data - The data from the event.
   */
  async structuredMessageHandler(data: any): Promise<void> {
    console.log(data);

    const structuredMessage = (data as any).detail as any as StructuredMessage;

    if (structuredMessage.type === 'SettingsApplied') {
      await this.settingsAppliedHandler(structuredMessage as SettingsApplied);
    }

    if (structuredMessage.type === 'ConversationText') {
      await this.conversationTextHandler(structuredMessage as ConversationText);
    }

    if (structuredMessage.type === 'FunctionCallRequest') {
      await this.functionCallRequestHandler(structuredMessage as FunctionCallRequest);
    }
  }

  /**
   * Handle the client message event.
   *
   * @param data - The data from the event.
   */
  async clientMessageHandler(data: any): Promise<void> {
    console.log('client message', data);
  }

  /**
   * Open the terms.
   */
  openTerms(): void {
    this.termsOpen = true;
  }

  /**
   * Close the terms.
   */
  closeTerms(): void {
    this.termsOpen = false;
  }

  /**
   * Check if the terms are open.
   *
   * @returns Whether the terms are open.
   */
  isTermsOpen(): boolean {
    return this.termsOpen;
  }

  /**
   * Agree to the terms.
   */
  agreeToTerms(): void {
    this.termsAgreed = true;
    this.closeTerms();
    this.connectAgent();
  }

  /**
   * Get the button text.
   *
   * @returns The button text.
   */
  buttonText(): string {
    if (this.isConnected()) {
      return 'Disconnect';
    }

    if (this.redirectedByAgent || this.termsAgreed) {
      return 'Continue talking';
    }

    return 'Ask our agent';
  }

  /**
   * Get the status text.
   *
   * @returns The status text.
   */
  connectedStatusText: string = getRandomString(AGENT_CONNECTED_STATUSES);

  disconnectedStatusText: string = getRandomString(AGENT_CLOSED_STATUSES);

  reconnectStatusText: string = getRandomString(AGENT_RECONNECT_STATUSES);

  statusText(): string {
    if (this.isConnected()) {
      return this.connectedStatusText;
    }

    if (this.redirectedByAgent || this.termsAgreed) {
      return this.reconnectStatusText;
    }

    return this.disconnectedStatusText;
  }

  /**
   * Check if the agent is connected.
   *
   * @returns Whether the agent is connected.
   */
  isConnected(): boolean {
    return this.agentState === AgentState.CONNECTED;
  }

  /**
   * Toggle the agent connection.
   */
  toggleAgentConnection(): void {
    if (this.isConnected()) {
      this.disconnectAgent();
    } else {
      this.connectAgent();
    }
  }

  /**
   * Connect the agent.
   */
  connectAgent(): void {
    this.agentState = AgentState.CONNECTING;
    // TODO: Remove this and kill it with fire before we go public/publish
    // TODO: Make the key a prop sent from the parent component
    // @ts-expect-error Shhh
    this.agentElement.idleTimeoutMs = 5000;
    // @ts-expect-error Shhh
    this.agentElement.apiKey = this.agentClientId;
    this.agentElement.setAttribute('config', JSON.stringify(this.config));
  }

  /**
   * Disconnect the agent.
   */
  disconnectAgent(): void {
    this.agentState = AgentState.DISCONNECTING;

    this.agentElement.removeAttribute('config');
  }

  /**
   * Handle the conversation text event.
   *
   * @param conversationText - The conversation text.
   */
  async conversationTextHandler(conversationText: ConversationText): Promise<void> {
    this.config = {
      ...this.config,
      context: {
        ...this.config.context,
        messages: [...this.config.context.messages, conversationText],
      },
    };
  }

  /**
   * Send a random thinking message for the agent to say.
   */
  async sendThinkingMessage(): Promise<void> {
    // @ts-expect-error Shhh
    this.agentElement.sendClientMessage(
      JSON.stringify({
        type: 'InjectAgentMessage',
        message: getRandomString(THINKING_MESSAGES),
      }),
    );
  }

  /**
   * Handle function calls from the agent.
   *
   * @param functionCallRequest - The function call request from the agent.
   */
  async functionCallRequestHandler(functionCallRequest: FunctionCallRequest): Promise<void> {
    const { function_name, input } = functionCallRequest;

    this.sendThinkingMessage();

    let output: any;
    if (function_name === searchAlgolia.id) {
      const result: AlgoliaHit[] = await searchAlgolia.function(input);
      output = result;
    } else if (function_name === grokPage.id) {
      const result: AlgoliaHit[] = await grokPage.function(input);
      output = result;
    } else if (function_name === changeUrl.id) {
      // @ts-expect-error Shhh
      this.agentElement.sendClientMessage(
        JSON.stringify({
          type: 'InjectAgentMessage',
          message: getRandomString(REDIRECTING_MESSAGES),
        }),
      );

      this.redirectedByAgent = true;

      setTimeout(async () => {
        await changeUrl.function(input);
      }, 5000);
    }

    if (output) {
      // @ts-expect-error Shhh
      this.agentElement.sendClientMessage(
        JSON.stringify({
          type: 'FunctionCallResponse',
          function_call_id: functionCallRequest.function_call_id,
          output: JSON.stringify(output),
        }),
      );
    }
  }

  /**
   * Handle the settings applied event.
   *
   * @param settingsApplied - The settings applied event.
   */
  async settingsAppliedHandler(_: SettingsApplied): Promise<void> {
    if (this.redirectedByAgent) {
      this.redirectedByAgent = false;

      // @ts-expect-error Shhh
      this.agentElement.sendClientMessage(
        JSON.stringify({
          type: 'InjectAgentMessage',
          message: getRandomString(REDIRECTED_MESSAGES),
        }),
      );
    } else {
      if (this.config.context.messages.length > 0) {
        // @ts-expect-error Shhh
        this.agentElement.sendClientMessage(
          JSON.stringify({
            type: 'InjectAgentMessage',
            message: getRandomString(RECONNECT_MESSAGES),
          }),
        );
      } else {
        // @ts-expect-error Shhh
        this.agentElement.sendClientMessage(
          JSON.stringify({
            type: 'InjectAgentMessage',
            message: getRandomString(GREETING_MESSAGES),
          }),
        );
      }
    }
  }

  render(): any {
    return (
      <div class="dg-widget__container">
        <ul class="dg-widget__conversation">
          {this.config.context.messages
            .filter((message: StructuredMessage) => message.type === 'ConversationText')
            .map((message: ConversationText) => {
              return (
                <li
                  class={`dg-widget__conversation__item ${
                    message.role === 'user'
                      ? 'dg-widget__conversation__item--user'
                      : 'dg-widget__conversation__item--assistant'
                  }`}
                >
                  <p class="dg-widget__conversation__item-content">{message.content}</p>
                </li>
              );
            })}
        </ul>
        <div class="dg-widget__wrapper">
          <div class="dg-widget__powered-by">
            <span>Powered by Deepgram </span>
            <a href="https://deepgram.com">Voice Agent API</a>
          </div>
          <div class="dg-widget__box">
            {!this.termsAgreed && (
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
                  <button class="dg-widget__button" onClick={() => this.agreeToTerms()}>
                    Agree
                  </button>
                  <button class="dg-widget__button dg-widget__button--secondary" onClick={() => this.closeTerms()}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
                <span>{this.statusText()}</span>
              </div>
              <div class="dg-widget__action-buttons">
                <button
                  class="dg-widget__button"
                  title="Voice agent"
                  onClick={() => (this.termsAgreed ? this.toggleAgentConnection() : this.openTerms())}
                >
                  <svg
                    viewBox="0 0 640 640"
                    xmlns="http://www.w3.org/2000/svg"
                    stroke="currentColor"
                    fill="currentColor"
                  >
                    <path d="M 82.6 88.6 l 104 -24 c 11.3 -2.6 22.9 3.3 27.5 13.9 l 48 112 c 4.2 9.8 1.4 21.3 -6.9 28 l -60.6 49.6 c 36 76.7 98.9 140.5 177.2 177.2 l 49.6 -60.6 c 6.8 -8.3 18.2 -11.1 28 -6.9 l 112 48 C 572.1 430.5 578 442.1 575.4 453.4 l -24 104 C 548.9 568.2 539.3 576 528 576 c -256.1 0 -464 -207.5 -464 -464 c 0 -11.2 7.7 -20.9 18.6 -23.4 z"></path>
                  </svg>
                  <span>{this.buttonText()}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
