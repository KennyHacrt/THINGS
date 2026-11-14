import type { HandPose } from './Hand';

export type CompanionActivity = { cursorPhase?:'point'|'down'|'type'; pose: HandPose; label: string; motion: boolean; busy: boolean };
export type DesktopBridge = {
  deskSpeak:(text:string)=>Promise<{accepted:boolean}>;
  deskEnable:()=>Promise<boolean>;
  deskSettings:()=>void;
  deskHide:()=>void;
  onDeskEvent:(callback:(event:AgentEvent & {role?:string;text?:string;speak?:boolean})=>void)=>()=>void;
  transcribeVoice:(audio:string,partial?:boolean)=>Promise<{text:string;language:string}>;
  aiConfig:()=>Promise<{configured:boolean;model:string;desktopAvailable:boolean}>;
  aiSave:(value:{apiKey?:string;model:string})=>Promise<{configured:boolean;model:string}>;
  aiTest:()=>Promise<{ok:boolean;model:string;message:string}>;
  desktopWindows:()=>Promise<{handle:number;title:string;app:string}[]>;
  agentStart:(task:{prompt:string;mode:'browser'|'desktop'|'both';handle:number|null;shareContext:boolean})=>Promise<{started:boolean}>;
  agentControl:(action:'pause'|'stop')=>Promise<{paused?:boolean;stopped?:boolean}>;
  agentApprove:(id:string,allow:boolean)=>Promise<boolean>;
  onAgentEvent:(callback:(event:AgentEvent)=>void)=>()=>void;
  setCompanion: (enabled: boolean) => Promise<boolean>;
  updateActivity: (activity: CompanionActivity) => void;
  onActivity: (callback: (activity: CompanionActivity) => void) => () => void;
  getActivity: () => Promise<CompanionActivity>;
  onQuickTask: (callback: (prompt: string) => void) => () => void;
  submitQuickTask: (prompt: string) => Promise<boolean>;
  closeQuick: () => void;
};
export type VisionFrame={target:string;id:string;image:string;width:number;height:number;title?:string;url?:string};
export type AgentEvent={type:string;taskId?:string;at?:string;prompt?:string;model?:string;turn?:number;action?:string;args?:Record<string,unknown>;result?:unknown;error?:string;approvalId?:string;preview?:unknown;allowed?:boolean;frame?:VisionFrame};

declare global { interface Window { thingsDesktop?: DesktopBridge } }
