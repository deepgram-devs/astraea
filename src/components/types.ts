import { AgentEvent } from "./enums";

export type AgentEventDetail = { variant: AgentEvent; detail?: object };

export interface UserMediaNodes {
  microphone: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  analyser: AnalyserNode;
}
