import { AudioStreamConfig } from "./types";

const AUDIO_CONFIG: AudioStreamConfig = {
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

export const BASE_CONFIG = {
  type: 'SettingsConfiguration',
  audio: AUDIO_CONFIG,
  agent: {
    listen: { model: 'nova-3' },
    speak: { model: 'aura-asteria-en' },
    think: {
      provider: { type: 'open_ai' },
      model: 'gpt-4o',
    },
  },
};

export const AGENT_RECONNECT_STATUSES = [
  'Continue where we left off?',
  'Let’s pick up our conversation.',
  'Continue our chat?',
  'Shall we resume?',
  'Shall we continue?',
]


export const AGENT_CONNECTED_STATUSES = [
  'Connected and listening!',
  'The agent is connected!',
  'Listening...',
  'Microphone is active!',
  'The agent is ready and listening!',
];

export const AGENT_CLOSED_STATUSES = [
  'Have a question?',
  'Need assistance?',
  'Looking for help?',
  'Do you need support?',
  'Have a query?',
  'Need some guidance?',
];

export const THINKING_MESSAGES = [
  'Hmm...',
  'Uh...',
  'Um...',
  'Well...',
  'Er...',
  'Ah...',
  "Let's see...",
  'Hmm, good question...',
  'Let me see...',
  'Okay...',
  'Right...',
  'So...',
  'Alright...',
];

export const GREETING_MESSAGES = [
  'Hello, how can I help you today?',
  'Hi, how can I help you today?',
  'Hey, how can I help you today?',
  'Good day, how can I help you today?',
];

export const RECONNECT_MESSAGES = [
  'Welcome back! How can I assist you further?',
  'Reconnected successfully. What would you like to do next?',
  'We are back online. How can I help you now?',
  'Connection restored. How can I assist you?',
  'We are reconnected. What can I do for you?',
  'Back in action! How can I assist you today?',
];

export const REDIRECTING_MESSAGES = [
  'Fasten your seatbelts, we are redirecting!',
  'Next stop, a new page! Please keep your arms and legs inside the browser.',
  'Redirecting... Don’t worry, I know a shortcut!',
  'Hang on, we are taking a quick detour!',
  'Prepare for warp speed, we are heading to a new page!',
  'Time to teleport! Redirecting in 3... 2... 1...',
  'Hold on, we are about to make a quick jump to another page!',
  'Redirecting... I hope you enjoy the ride!',
  'We are off to see the wizard... or at least a new page!'
];

export const REDIRECTED_MESSAGES = [
  'We have arrived! How can I assist you here?',
  'Welcome to your destination! What would you like to do next?',
  'Here we are! How can I help you further?',
  'We made it! What can I do for you now?',
  'You have been redirected successfully. How can I assist you?',
  'We are here! What would you like to explore next?',
  'Welcome to the new page! How can I be of service?',
  'We have landed! What can I help you with?',
  'You have reached your destination. How can I assist you further?'
];
