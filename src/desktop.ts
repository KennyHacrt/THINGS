import type { HandPose } from './Hand';

export type CompanionActivity = { pose: HandPose; label: string; motion: boolean; busy: boolean };
export type DesktopBridge = {
  setCompanion: (enabled: boolean) => Promise<boolean>;
  updateActivity: (activity: CompanionActivity) => void;
  onActivity: (callback: (activity: CompanionActivity) => void) => () => void;
  getActivity: () => Promise<CompanionActivity>;
  onQuickTask: (callback: (prompt: string) => void) => () => void;
  submitQuickTask: (prompt: string) => Promise<boolean>;
  closeQuick: () => void;
};

declare global { interface Window { thingsDesktop?: DesktopBridge } }
