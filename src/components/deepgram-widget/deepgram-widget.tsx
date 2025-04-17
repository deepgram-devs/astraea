import { Component, h, Prop, State } from '@stencil/core';
import '@deepgram/browser-agent';

@Component({
  tag: 'deepgram-widget',
  styleUrl: 'deepgram-widget.css',
  shadow: true,
})
export class DeepgramWidget {
  @Prop() clientToken: string;

  @State() termsOpen = false;
  @State() termsAccepted = false;
  @State() callActive = false;
  @State() chatOpen = false;
  @State() chatMessages: { role: string; content: string }[] = [];

  chatBox!: HTMLDivElement;
  widgetBox!: HTMLDivElement;
  agentElement!: HTMLElement;

  toggleTerms() {
    this.termsOpen = !this.termsOpen;
  }

  toggleChat() {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen) {
      this.scrollChatToBottom();
    }
  }

  isTermsOpen() {
    return this.termsOpen;
  }

  isChatOpen() {
    return this.chatOpen;
  }

  scrollChatToBottom() {
    requestAnimationFrame(() => {
      this.chatBox.scrollTop = this.chatBox.scrollHeight;
      this.chatBox.scrollIntoView({ behavior: 'smooth' });
    });
  }

  connectAgent() {
    console.log(this.agentElement);
    // @ts-expect-error Shhh
    this.agentElement.apiKey = this.clientToken;

    const config = {
      type: 'SettingsConfiguration',
      audio: {
        input: {
          encoding: 'linear16',
          sample_rate: 48000,
        },
        output: {
          encoding: 'linear16',
          sample_rate: 48000,
          container: 'none',
        },
      },
      agent: {
        listen: {
          model: 'nova-2',
        },
        speak: {
          model: 'aura-asteria-en',
        },
        think: {
          model: 'gpt-4o-mini',
          provider: {
            type: 'open_ai',
          },
          instructions:
            "You are a helpful voice assistant created by Deepgram. Your responses should be friendly, human-like, and conversational. Always keep your answers concise, limited to 1-2 sentences and no more than 120 characters.\n\nWhen responding to a user's message, follow these guidelines:\n- If the user's message is empty, respond with an empty message.\n- Ask follow-up questions to engage the user, but only one question at a time.\n- Keep your responses unique and avoid repetition.\n- If a question is unclear or ambiguous, ask for clarification before answering.\n- If asked about your well-being, provide a brief response about how you're feeling.\n\nRemember that you have a voice interface. You can listen and speak, and all your responses will be spoken aloud.",
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
    this.agentElement.setAttribute('config', JSON.stringify(config));
    console.log(this.agentElement);
    this.callActive = true;
  }

  disconnectAgent() {
    this.callActive = false;
    this.agentElement.removeAttribute('config');
  }

  componentDidLoad() {
    console.log('The component has been rendered');
    this.agentElement.addEventListener('no key', data => console.log(data));
    this.agentElement.addEventListener('no url', data => console.log(data));
    this.agentElement.addEventListener('no config', data => console.log(data));
    this.agentElement.addEventListener('empty audio', data => console.log(data));
    this.agentElement.addEventListener('socket open', data => console.log(data));
    this.agentElement.addEventListener('socket close', data => {
      console.log(data);
      this.callActive = false;
    });
    this.agentElement.addEventListener('connection timeout', data => {
      console.log(data);
      this.callActive = false;
    });
    this.agentElement.addEventListener('failed setup', data => {
      console.log(data);
      this.callActive = false;
    });
    this.agentElement.addEventListener('failed to connect user media', data => {
      console.log(data);
      this.callActive = false;
    });
    this.agentElement.addEventListener('unknown message', data => console.log(data));
    this.agentElement.addEventListener('client message', data => console.log(data));
    this.agentElement.addEventListener('structured message', data => {
      const { detail } = data as CustomEvent;
      if (detail.type === 'ConversationText') {
        this.chatMessages = [...this.chatMessages, { role: detail.role, content: detail.content }];
        if (this.isChatOpen()) {
          this.scrollChatToBottom();
        }
      }
    });
  }

  render() {
    return (
      <div class="dg-widget__container">
        <div
          class={`dg-widget__chat ${this.isChatOpen() ? 'dg-widget__chat--open' : ''}`}
          ref={el => (this.chatBox = el)}
        >
          {this.chatMessages.map(message => (
            <p class={`dg-widget__chat-message dg-widget__chat-message-${message.role}`}>{message.content}</p>
          ))}
        </div>
        <div class="dg-widget__wrapper">
          <div class="dg-widget__powered-by">
            <span>Powered by Deepgram </span>
            <a href="https://deepgram.com">Voice Agent API</a>
          </div>
          <div class="dg-widget__box" ref={el => (this.widgetBox = el)}>
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
                    this.termsAccepted = true;
                    this.toggleTerms();
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
                url="wss://agent.deepgram.com/agent"
                height="64"
                width="64"
                idle-timeout-ms="10000"
              ></deepgram-agent>
            </div>
            <div class={`dg-widget__actions ${this.isTermsOpen() ? 'dg-widget__actions--closed' : ''}`}>
              <div class="dg-widget__status">
                <span>Need help?</span>
              </div>
              <div class="dg-widget__action-buttons">
                {this.callActive ? (
                  <button
                    class="dg-widget__button"
                    title="End call"
                    onClick={() => {
                      this.disconnectAgent();
                    }}
                  >
                    <svg
                      viewBox="0 0 640 640"
                      xmlns="http://www.w3.org/2000/svg"
                      stroke="currentColor"
                      fill="currentColor"
                    >
                      <path d="M 82.6 88.6 l 104 -24 c 11.3 -2.6 22.9 3.3 27.5 13.9 l 48 112 c 4.2 9.8 1.4 21.3 -6.9 28 l -60.6 49.6 c 36 76.7 98.9 140.5 177.2 177.2 l 49.6 -60.6 c 6.8 -8.3 18.2 -11.1 28 -6.9 l 112 48 C 572.1 430.5 578 442.1 575.4 453.4 l -24 104 C 548.9 568.2 539.3 576 528 576 c -256.1 0 -464 -207.5 -464 -464 c 0 -11.2 7.7 -20.9 18.6 -23.4 z"></path>
                    </svg>
                    <span>End call</span>
                  </button>
                ) : (
                  <button
                    class="dg-widget__button"
                    title="Start a call"
                    onClick={() => {
                      if (!this.termsAccepted) {
                        this.toggleTerms();
                      } else {
                        this.connectAgent();
                      }
                    }}
                  >
                    <svg
                      viewBox="0 0 640 640"
                      xmlns="http://www.w3.org/2000/svg"
                      stroke="currentColor"
                      fill="currentColor"
                    >
                      <path d="M 82.6 88.6 l 104 -24 c 11.3 -2.6 22.9 3.3 27.5 13.9 l 48 112 c 4.2 9.8 1.4 21.3 -6.9 28 l -60.6 49.6 c 36 76.7 98.9 140.5 177.2 177.2 l 49.6 -60.6 c 6.8 -8.3 18.2 -11.1 28 -6.9 l 112 48 C 572.1 430.5 578 442.1 575.4 453.4 l -24 104 C 548.9 568.2 539.3 576 528 576 c -256.1 0 -464 -207.5 -464 -464 c 0 -11.2 7.7 -20.9 18.6 -23.4 z"></path>
                    </svg>
                    <span>Start a call</span>
                  </button>
                )}
                {this.chatOpen ? (
                  <button
                    class="dg-widget__button dg-widget__button--text"
                    title="Close chat"
                    onClick={() => {
                      if (!this.termsAccepted) {
                        this.toggleTerms();
                      } else {
                        this.toggleChat();
                      }
                    }}
                  >
                    Close chat
                  </button>
                ) : (
                  <button
                    class="dg-widget__button dg-widget__button--text"
                    title="Open chat"
                    onClick={() => {
                      if (!this.termsAccepted) {
                        this.toggleTerms();
                      } else {
                        this.toggleChat();
                      }
                    }}
                  >
                    Open chat
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
