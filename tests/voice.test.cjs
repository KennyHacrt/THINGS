const test=require('node:test'),assert=require('node:assert/strict');
const {VoiceTools}=require('../electron/voice.cjs');
test('invalid and oversized voice requests never start the transcription worker',async()=>{
  const voice=new VoiceTools();for(const value of [null,'not audio','UklGR'+'A'.repeat(2000001)])await assert.rejects(voice.transcribe(value),/Invalid voice recording/);
  assert.equal(voice.worker,null);voice.close();
});
