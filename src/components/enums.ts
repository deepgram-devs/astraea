export enum VoiceBotStatus {
  Active = 'active',
  Sleeping = 'sleeping',
  NotStarted = 'not-started',
}

export enum AgentEvent {
  NO_KEY = 'no key',
  NO_URL = 'no url',
  NO_CONFIG = 'no config',
  EMPTY_AUDIO = 'empty audio',
  SOCKET_OPEN = 'socket open',
  SOCKET_CLOSE = 'socket close',
  CONNECTION_TIMEOUT = 'connection timeout',
  /** Something went wrong in a way we don't expect the user to recover */
  FAILED_SETUP = 'failed setup',
  FAILED_TO_CONNECT_USER_MEDIA = 'failed to connect user media',
  UNKNOWN_MESSAGE = 'unknown message',
  STRUCTURED_MESSAGE = 'structured message',
  CLIENT_MESSAGE = 'client message',
}

export enum MessageType {
  /** first detection of user speech */
  UserStartedSpeaking = 'UserStartedSpeaking',
  /** EOT model decides the user's ended their turn */
  EndOfThought = 'EndOfThought',
  /** Agent audio starts coming across the socket */
  AgentStartedSpeaking = 'AgentStartedSpeaking',
  /** All agent audio is sent (different from TTS being complete!) */
  AgentAudioDone = 'AgentAudioDone',
}

export enum Sender {
  User,
  Agent,
}

export enum ObservedAttributes {
  config = 'config',
  idleTimeoutMs = 'idle-timeout-ms',
}