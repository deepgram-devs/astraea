export interface AudioStreamConfig {
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

export interface VoiceAgentConfig {
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
    functions?: AgentFunction[];
  };
}

export interface ConversationContext {
  messages: StructuredMessage[];
  replay: boolean;
}

/**
 * The configuration for the Deepgram voice agent service.
 *
 * @see https://developers.deepgram.com/docs/voice-agent#configuration
 * @docs https://stenciljs.com/docs/properties#object-props
 */
export interface VoiceAgentServiceConfig {
  type: string;
  audio: AudioStreamConfig;
  agent: VoiceAgentConfig;
  context?: ConversationContext;
  language?: string;
}

export interface AgentFunction {
  name: string;
  description: string;
  url?: string;
  method?: string;
  headers?: RequestHeader[];
  key?: string;
  parameters: FunctionParameterObject | Record<string, never>;
}

export type FunctionParameter = FunctionParameterScalar | FunctionParameterObject;

export interface FunctionParameterBase {
  type: string;
  description?: string;
}

export interface FunctionParameterObject extends FunctionParameterBase {
  type: 'object';
  properties: Record<string, FunctionParameter>;
  required?: string[];
}

export interface FunctionParameterScalar extends FunctionParameterBase {
  type: 'string' | 'integer';
}

export interface RequestHeader {
  key: string;
  value: string;
}

export interface StructuredMessage {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface SettingsApplied extends StructuredMessage {
  type: 'SettingsApplied';
}

export interface FunctionCallRequest extends StructuredMessage {
  type: 'FunctionCallRequest';
  function_name: string;
  function_call_id: string;
  input: Record<string, unknown>;
}

export interface ConversationText extends StructuredMessage {
  type: 'ConversationText';
  content: string;
  role: string;
}

export type ConversationHistory = StructuredMessage[];

export interface WidgetFunctionConfig {
    id: string;
    config: AgentFunction;
    function: (input: Record<string, unknown>) => Promise<any>;
}
