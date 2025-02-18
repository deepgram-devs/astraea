import { Component, h, Prop, State } from '@stencil/core';

@Component({
  tag: 'deepgram-widget',
  styleUrl: 'deepgram-widget.css',
  shadow: true,
})
export class DeepgramWidget {
  @Prop() clientToken: string;

  @State() termsOpen = false;

  toggleTerms() {
    this.termsOpen = !this.termsOpen;
  }

  isTermsOpen() {
    return this.termsOpen;
  }

  render() {
    return (
      <div class="dg-widget__container">
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
                <button class="dg-widget__button" onClick={() => this.toggleTerms()}>
                  Agree
                </button>
                <button class="dg-widget__button dg-widget__button--secondary" onClick={() => this.toggleTerms()}>
                  Cancel
                </button>
              </div>
            </div>
            <div class={`dg-widget__avatar ${this.isTermsOpen() ? 'dg-widget__avatar--closed' : ''}`}>
              <deepgram-orb size={64} lineWidthMultiplier={0.75}></deepgram-orb>
            </div>
            <div class={`dg-widget__actions ${this.isTermsOpen() ? 'dg-widget__actions--closed' : ''}`}>
              <div class="dg-widget__status">
                <span>Need help?</span>
              </div>
              <div class="dg-widget__action-buttons">
                <button class="dg-widget__button" title="Start a call" onClick={() => this.toggleTerms()}>
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
                <button
                  class="dg-widget__button dg-widget__button--text"
                  title="Start a call"
                  onClick={() => this.toggleTerms()}
                >
                  Open chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
