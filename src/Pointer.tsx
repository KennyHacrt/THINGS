import { useEffect, useRef, useState } from 'react';
import { Hand } from './Hand';

/** Click-through character cursor. It never creates or intercepts input events. */
export function Pointer({ enabled, motion }: {enabled:boolean; motion:boolean}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (!enabled || !matchMedia('(pointer: fine)').matches) return;
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (ref.current) ref.current.style.transform = `translate3d(${event.clientX - 36}px, ${event.clientY - 7}px, 0)`;
      setVisible(true);
    };
    const leave = () => setVisible(false);
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    window.addEventListener('pointermove', move, {passive:true}); window.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); document.addEventListener('pointerleave', leave); window.addEventListener('blur', leave);
    document.documentElement.classList.add('hand-cursor-enabled');
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); document.removeEventListener('pointerleave', leave); window.removeEventListener('blur', leave); document.documentElement.classList.remove('hand-cursor-enabled'); };
  }, [enabled]);
  if (!enabled) return null;
  return <div ref={ref} className={`character-pointer ${visible ? 'visible' : ''} ${motion ? '' : 'reduce-motion'}`} aria-hidden="true"><Hand pose={pressed ? 'tap' : 'point'}/></div>;
}
