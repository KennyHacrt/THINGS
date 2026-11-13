import { useEffect, useState } from 'react';
import { Hand } from './Hand';
import type { CompanionActivity } from './desktop';

export function Companion() {
  const [activity, setActivity] = useState<CompanionActivity>({pose:'idle', label:'Your little helper', motion:true, busy:false});
  useEffect(() => {
    let disposed = false;
    const unsubscribe = window.thingsDesktop?.onActivity(setActivity);
    void window.thingsDesktop?.getActivity().then(value => {if(!disposed) setActivity(value);}).catch(() => {});
    return () => {disposed=true;unsubscribe?.();};
  }, []);
  return <div className={`desktop-hand ${activity.motion ? '' : 'reduce-motion'}`}>
    <Hand pose={activity.pose}/><span className="desktop-hand-label">{activity.label}</span>
  </div>;
}
