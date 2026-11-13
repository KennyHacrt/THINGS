import { dinnerShortlist, type Scenario } from './engine.ts';

export const tabGroups = [ {name: 'Research', tabs: ['Gesture interaction notes', 'Agent architecture guide']}, {name: 'Inspiration', tabs: ['Minimal interface collection', 'Character motion studies']}, {name: 'Tools', tabs: ['Project repository', 'Hackathon checklist']} ];
export const schedule = [ {time: '14:00 – 14:50', name: 'Make the important thing', type: 'Focus · 50 min'}, {time: '14:50 – 15:00', name: 'Stretch. Water. Breathe.', type: 'Break · 10 min'}, {time: '15:00 – 15:50', name: 'Keep the momentum', type: 'Focus · 50 min'}, {time: '15:50 – 16:00', name: 'A little fresh air', type: 'Break · 10 min'}, {time: '16:00 – 17:00', name: 'Review, refine, wrap up', type: 'Focus · 60 min'} ];

function escapeCalendar(value: string) { return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
export function calendarResult(day: string, uid: string, now = new Date()) {
  const date = new Date(`${day}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.getFullYear() !== Number(day.slice(0, 4)) || date.getMonth() + 1 !== Number(day.slice(5, 7)) || date.getDate() !== Number(day.slice(8, 10))) throw new Error('Choose a valid calendar date.');
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//THINGS//Afternoon Plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  schedule.forEach((block, index) => {
    const [start, end] = block.time.split(' – ').map(t => t.replace(':', '') + '00');
    lines.push('BEGIN:VEVENT', `UID:${escapeCalendar(uid.replace(/[\r\n]/g, ''))}-${index}@things.local`, `DTSTAMP:${stamp}`, `DTSTART:${day.replace(/-/g, '')}T${start}`, `DTEND:${day.replace(/-/g, '')}T${end}`, `SUMMARY:${escapeCalendar(block.name)}`, `DESCRIPTION:${escapeCalendar(block.type + '. Created by the THINGS local demo.')}`, 'END:VEVENT');
  });
  return [...lines, 'END:VCALENDAR', ''].join('\r\n');
}

export function resultMarkdown(scenario: Scenario, title: string) {
  const lines = [`# ${title}`, '', '> Created by THINGS from bundled sample data.', ''];
  if(scenario === 'recipes') dinnerShortlist().forEach(r => lines.push(`- **${r.name}** · ${r.time} min · Vegetarian`, `  ${r.note}`));
  if(scenario === 'tabs') tabGroups.forEach(g => lines.push(`## ${g.name}`, '', ...g.tabs.map(t => `- ${t}`), ''));
  if(scenario === 'plan') schedule.forEach(b => lines.push(`- **${b.time}** — ${b.name} (${b.type})`));
  return lines.join('\n') + '\n';
}

export function downloadFile(content:string, fileName:string, mime:string) {
  const url = URL.createObjectURL(new Blob([content], {type:mime}));
  const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
