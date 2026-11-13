import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarResult, resultMarkdown} from '../src/results.ts';
test('calendar exports five valid local-time blocks on the selected date', () => {
  const ics=calendarResult('2026-11-13','test',new Date('2026-11-13T01:00:00Z'));
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length,5);
  assert.ok(ics.includes('DTSTART:20261113T140000\r\n'));
  assert.ok(ics.includes('DTEND:20261113T170000\r\n'));
  assert.ok(ics.includes('DTSTAMP:20261113T010000Z'));
  assert.equal(new Set(ics.match(/UID:.*/g)).size,5);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});
test('invalid and impossible calendar dates are rejected', () => {
  for(const day of ['','not a date','2026-02-30','2026-13-01','2026-11-13\r\nBEGIN:VEVENT']) assert.throws(() => calendarResult(day,'x'));
});
test('notes contain actual filtered results and honest provenance', () => {
  const md=resultMarkdown('recipes','Dinner');
  assert.ok(md.includes('bundled sample data'));
  assert.ok(md.includes('Lemon & pea pasta'));
  assert.ok(!md.includes('salmon'));
  assert.ok(!md.includes('risotto'));
  assert.equal((md.match(/Vegetarian/g)||[]).length,3);
});
