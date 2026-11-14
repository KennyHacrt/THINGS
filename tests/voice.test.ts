import test from 'node:test';
import assert from 'node:assert/strict';
import {wavBase64} from '../src/voice.ts';

test('microphone samples encode as bounded 16 kHz mono PCM for the actual recognizer',()=>{
  const samples=new Float32Array(48000);for(let i=0;i<samples.length;i++)samples[i]=Math.sin(2*Math.PI*440*i/48000)*0.5;
  const wav=Buffer.from(wavBase64([samples.subarray(0,16000),samples.subarray(16000)],48000),'base64');
  assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
  assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),16000);assert.equal(wav.readUInt16LE(34),16);assert.equal(wav.readUInt32LE(40),32000);assert.equal(wav.length,32044);
  const first=wav.readInt16LE(46);assert.ok(first>2500&&first<3100,'440 Hz signal survives resampling');
});
