import { useId } from 'react';

export type HandPose = 'idle' | 'walk' | 'think' | 'tap' | 'point' | 'success';

/** Original vector character. The top index fingertip is the pointer hotspot. */
export function Hand({ pose = 'idle', className = '' }: { pose?: HandPose; className?: string }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`thing-hand pose-${pose} ${className}`} viewBox="0 0 180 210" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`skin-${id}`} x1="35" y1="40" x2="143" y2="190" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f6dfc9"/><stop offset=".55" stopColor="#dfbba1"/><stop offset="1" stopColor="#c99880"/>
      </linearGradient>
      <linearGradient id={`nail-${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0df"/><stop offset="1" stopColor="#d8b8a6"/></linearGradient>
    </defs>
    <ellipse className="hand-shadow" cx="92" cy="191" rx="55" ry="8" fill="#281b15" opacity=".12"/>
    {(pose === 'point' || pose === 'tap') ? <g className="hand-body" stroke="#785747" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M59 188 53 163C49 153 37 142 32 131l-11-24c-5-12 7-20 15-10l17 20 6 5V28c0-17 22-17 22 0v66c5-13 23-11 23 3 7-13 24-8 23 6 13-8 24 0 21 15l-8 42c-2 13-15 22-18 29Z" fill={`url(#skin-${id})`}/>
      <path d="M59 188c15-5 40-6 63 1l-2 8c-20 6-41 6-60-1Z" fill="#b68a75"/>
      <path d="m65 182 3 14m8-16 2 17m9-17 1 17m10-17-1 17m11-15-2 15m9-13-2 12m-45-57 49 14m-42-22-5 16m18-12-5 16m18-12-5 16m17-11-5 16" stroke="#584739"/>
      <path d="M65 27c0-9 10-9 10 0v8H65Z" fill={`url(#nail-${id})`} strokeWidth="1"/>
      <path d="m64 49 12 1m-12 9 12 1m7 41v18m21-15-2 21m24-16-4 21M58 125c10-4 15 3 18 10" opacity=".4"/>
    </g> : <g className="hand-body" stroke="#785747" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M56 120 43 99C31 80 17 87 22 102l19 43c5 12 10 16 13 30l3 14c15 8 43 8 62-1l2-17c5-13 20-22 22-43l3-41c1-15-17-18-21-2l-4 24 2-62c1-17-18-20-21-2l-5 59 1-79c0-18-21-18-22 0l-3 78-3-60c-1-17-21-17-21 0l7 77Z" fill={`url(#skin-${id})`}/>
      <path d="M57 188c16-6 39-7 62-1l-1 8c-20 7-42 6-59-1Z" fill="#b68a75"/>
      <path d="m61 182 4 12m7-14 3 15m8-16 2 17m9-17 1 16m9-15-1 15m10-13-2 12" stroke="#463d36" strokeWidth="2.5"/>
      <path d="m60 144 49 14m-42-22-5 16m18-12-5 16m18-12-5 16m17-11-5 16" stroke="#584739" strokeWidth="2.4"/>
      <path d="m58 105 2 15m17-19-1 20m22-19-2 20m25-13-5 22M47 126c11-3 18 5 20 13m19-11 12 4" opacity=".4"/>
      <path d="M78 35c3 2 10 2 14 0M53 54c3 2 9 2 13 0m39-1 12 1m12 42 10 1" strokeWidth="1.4" opacity=".5"/>
      <path d="M80 23c0-8 12-8 12 0v6H80Z" fill={`url(#nail-${id})`} strokeWidth="1"/>
      <path d="M53 43c0-8 11-8 11 0v5H53Zm53 3c0-8 11-8 11 0v5h-11Zm23 39c1-7 10-6 10 1v5h-11Z" fill={`url(#nail-${id})`} strokeWidth="1"/>
      <path d="m34 96-5-5m10 18-4-5" opacity=".45"/>
    </g>}
    <g className="success-sparks" stroke="#8770dc" strokeWidth="3" strokeLinecap="round"><path d="M20 47v12m-6-6h12m124-18v12m-6-6h12m-2 104v10m-5-5h10"/></g>
  </svg>;
}
