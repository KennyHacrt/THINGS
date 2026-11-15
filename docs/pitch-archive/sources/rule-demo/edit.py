from pathlib import Path
import json,bisect,subprocess,wave,numpy as np
R=Path(__file__).resolve().parent;P=R.parent.parent;D=R/'edit';D.mkdir(exist_ok=True);O=P/'outputs/video';O.mkdir(parents=True,exist_ok=True)
phases=json.loads((R/'phases.json').read_text(encoding='utf-8'));frames=json.loads((R/'frames.json').read_text(encoding='utf-8'));times=[f['time'] for f in frames]
assert len(phases)==12 and phases[-1]['kind']=='outro','Recording is not complete'
def enc(t):return frames[max(0,min(len(frames)-1,bisect.bisect_right(times,t)-1))]['frame']/10

def duration(p):
 with wave.open(str(p)) as w:return w.getnframes()/w.getframerate()
def run(args):subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',*map(str,args)],check=True)
voice_total=sum(duration(R/s['audio'])+.12 for s in phases if s['audio']);hold=2.2;work_budget=60-voice_total-hold;weights=[.29,.24,.16,.20,.11]
work_index=0;offset=0;audio=np.zeros(60*48000,dtype=np.float32);timeline=[]
def mix(file,at,gain=1):
 pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-f','f32le','-ac','1','-ar','48000','-']);samples=np.frombuffer(pcm,dtype='<f4')*gain;start=round(at*48000);n=min(len(samples),len(audio)-start)
 if n>0:audio[start:start+n]+=samples[:n]
for i,s in enumerate(phases):
 a,b=enc(s['start']),enc(s['end']);b=max(a+.1,b);source=b-a
 if s['audio']:target=duration(R/s['audio'])+.12+(hold if s['kind']=='outro' else 0);mix(R/s['audio'],offset)
 else:target=work_budget*weights[work_index];mix(R/f'reply-{work_index}.wav',offset+.1,.9);work_index+=1
 timeline.append({**s,'offset':offset,'duration':target,'encodedStart':a,'encodedEnd':b})
 target_source=target-(hold if s['kind']=='outro' else 0)
 vf=f'setpts=(PTS-STARTPTS)*{target_source/source},fps=30,tpad=stop_mode=clone:stop_duration={hold if s["kind"]=="outro" else .1},trim=duration={target}'
 run(['-ss',a,'-i',R/'raw.mp4','-t',target,'-an','-vf',vf,'-c:v','libx264','-threads',4,'-preset','veryfast','-crf',18,D/f'part-{i}.mp4'])
 offset+=target
assert abs(offset-60)<.001
(R/'timeline.json').write_text(json.dumps(timeline,indent=2),encoding='utf-8')
# A quiet click accompanies each actual recorded click; no subtitles are added.
actions=json.loads((R/'actions.json').read_text(encoding='utf-8'))
for action in actions:
 if action['action']!='click':continue
 s=next((x for x in timeline if x['start']<=action['time']<=x['end']),None)
 if not s:continue
 t=s['offset']+(action['time']-s['start'])/(s['end']-s['start'])*s['duration'];start=round(t*48000);n=min(1440,len(audio)-start)
 if n>0:
  z=np.arange(n)/48000;audio[start:start+n]+=.045*np.sin(2*np.pi*1100*z)*np.exp(-z*180)
audio=np.clip(audio,-.98,.98)
with wave.open(str(D/'audio.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes((audio*32767).astype('<i2').tobytes())
(D/'concat.txt').write_text(''.join(f"file '{(D/f'part-{i}.mp4').as_posix()}'\n" for i in range(len(phases))),encoding='utf-8')
run(['-f','concat','-safe',0,'-i',D/'concat.txt','-c','copy',D/'picture.mp4'])
def stamp(t):
 h=int(t//3600);m=int(t//60)%60;s=t%60;return f'{h}:{m:02}:{s:05.2f}'
head='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Segoe UI,32,&H00FFFFFF,&H00FFFFFF,&H70453129,&H70453129,-1,0,0,0,100,100,0,0,1,1,1,7,1432,32,112,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
rows=[]
for s in timeline:
 title=s['title'].replace('Comparing flights to Tokyo','Comparing flights\\Nto Tokyo').replace('Searching research papers','Searching research\\Npapers').replace('THINGS · Scripted demo','THINGS\\NScripted demo').replace('THINGS · Your little helping hand','THINGS\\NYour little helping hand')
 rows.append(f"Dialogue: 1,{stamp(s['offset'])},{stamp(s['offset']+s['duration'])},Title,,0,0,0,,{title}")
(R/'titles.ass').write_text(head+'\n'.join(rows),encoding='utf-8')
run(['-i',D/'picture.mp4','-i',D/'audio.wav','-vf',"ass=work/rule-pitch/titles.ass",'-map','0:v','-map','1:a','-c:v','libx264','-threads',4,'-preset','fast','-crf',18,'-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t',60,'-movflags','+faststart',O/'THINGS-rule-based-pitch-60s.mp4'])
for t in [12,24,36,47,56]:run(['-ss',t,'-i',O/'THINGS-rule-based-pitch-60s.mp4','-frames:v',1,D/f'preview-{t}.jpg'])
(O/'THINGS-rule-based-pitch-notes.txt').write_text('Rule-based pitch walkthrough, 60 seconds.\nPrerecorded English voice; action titles only, no video subtitles.\nControlled local sample pages with real Chromium clicks, typing and scrolling.\nNo live AI decisions, API calls, bookings, orders or publications.\n'+str(len(actions))+' recorded input actions.\n',encoding='utf-8')
print('FINISHED: 60-second rule-based pitch video. Actions:',len(actions),flush=True)
