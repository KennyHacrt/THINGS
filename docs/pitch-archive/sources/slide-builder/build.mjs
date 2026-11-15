import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const runtime='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1105-1297-0_26.1105.1297.0_x64__3k8sg7r9htsxt/dependencies';
process.env.RUNTIME_NODE_MODULES=runtime+'/node/node_modules';
process.env.RUNTIME_NODE=runtime+'/node/bin/node.exe';
const {Presentation,PresentationFile}=await import(pathToFileURL(runtime+'/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs'));
const require=createRequire(import.meta.url),sharp=require('../recorder-deps/node_modules/sharp');
const root=process.cwd(),out=path.join(root,'outputs/pitch-slides'),assets=path.join(root,'work/pitch-slides/assets');
await fs.mkdir(out,{recursive:true});await fs.mkdir(assets,{recursive:true});
const C={bg:'#F7F5F2',ink:'#29252F',purple:'#8966B5',light:'#EAE3F1',muted:'#81798A',line:'#DCD5E2',white:'#FFFFFF'};
const P=Presentation.create({slideSize:{width:1920,height:1080}}),names=[],copy=[];
function txt(s,t,x,y,w,h,size=36,color=C.ink,bold=false){const a=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});a.text=t;a.text.style={typeface:'Segoe UI',fontSize:size,color,bold,verticalAlignment:'top',alignment:'left'};a.text.insets=0;return a;}
function rect(s,x,y,w,h,fill=C.light,line='none',radius=0){return s.shapes.add({geometry:radius?'roundRect':'rect',position:{left:x,top:y,width:w,height:h},fill,line:{fill:line,width:line==='none'?0:2},borderRadius:radius});}
function rule(s,x,y,w,col=C.line){rect(s,x,y,w,2,col);}
function base(name,section,title,sub=''){const s=P.slides.add();s.background.fill=C.bg;names.push(name);copy.push({slide:names.length,name,title,sub});txt(s,section.toUpperCase(),96,65,1500,40,23,C.purple,true);txt(s,title,96,145,1728,190,86,C.ink,true);if(sub)txt(s,sub,100,368,1680,100,34,C.muted);txt(s,'things.',96,1000,220,40,28,C.ink,true);txt(s,String(names.length).padStart(2,'0')+' / 12',1690,1004,140,32,22,C.muted);return s;}
async function pic(s,file,x,y,w,h,fit='contain'){s.images.add({blob:new Uint8Array(await fs.readFile(file)),contentType:file.endsWith('.jpg')?'image/jpeg':'image/png',alt:path.basename(file),position:{left:x,top:y,width:w,height:h},fit});}
function notes(s,t){s.speakerNotes.text=t;}
function link(s,a,b,from='right',to='left',color=C.purple){return s.shapes.connect(a,b,{kind:'straight',fromSide:from,toSide:to,line:{fill:color,width:3},tail:{type:'triangle',width:'med',length:'med'}});}
function node(s,label,detail,x,y,w=480,h=145,fill=C.white){const a=rect(s,x,y,w,h,fill,C.line,18);txt(s,label,x+26,y+22,w-52,50,35,C.ink,true);if(detail)txt(s,detail,x+26,y+79,w-52,h-84,25,C.muted);return a;}

// 01. The existing commissioned brand artwork anchors the palette.
{
 const s=P.slides.add();names.push('01-cover');copy.push({slide:1,title:'THINGS',sub:'Your little helping hand'});s.background.fill=C.bg;
 await pic(s,path.join(root,'outputs/branding/THINGS-cover.png'),0,0,1920,1080,'cover');
 notes(s,'THINGS is a voice-controlled Windows desktop prototype, inspired by the helping hand in Wednesday and the voice delegation concept in Hands. Original interface and character. Cover artwork is an existing THINGS brand asset.');
}
// 02. Specific user and task, with a quiet editorial layout.
{
 const s=base('02-problem','The problem','Small tasks keep\npulling you away','For students and busy teams, everyday admin competes with the work they sat down to do.');
 const rows=[['01','Compare flights','Dates, airports, prices and another tab.'],['02','Choose lunch','Browse menus, check options, start again.'],['03','Catch up on updates','Read the feed and pull out what matters.']];
 rows.forEach((r,i)=>{let y=493+i*140;txt(s,r[0],100,y,100,70,46,C.purple);txt(s,r[1],245,y,590,70,46,C.ink,true);txt(s,r[2],890,y+9,890,70,32,C.muted);rule(s,245,y+104,1535);});
 notes(s,'Qualitative problem framing, not a measured time-saving claim. These are example tasks from the supplied teammate script. No statement that competing assistants lack computer use.');
}
// 03. The process itself is the friction.
{
 const s=base('03-context-switching','The problem','One request,\na lot of clicking','Searching, comparing and copying results breaks the flow of a report, a project or a study session.');
 const labels=['Open a site','Search','Compare','Copy results','Return to work'];
 const shapes=labels.map((l,i)=>{const x=100+i*350;const a=rect(s,x,553,310,125,i===4?C.light:C.white,'none',16);txt(s,l,x+22,592,277,60,31,C.ink,i===4);return a;});
 shapes.slice(0,-1).forEach((n,i)=>link(s,n,shapes[i+1]));
 txt(s,'Your attention follows every step',100,805,1350,100,55,C.purple,true);
 notes(s,'The flow diagram illustrates the manual sequence, not quantitative evidence or a claim about every user.');
}
// 04. Natural speech, real interface, no invented hold-to-talk behavior.
{
 const s=base('04-solution','Our solution','Tell THINGS what needs doing','Speak naturally. THINGS shows what it heard and starts the task.');
 const source=path.join(root,'work/rule-pitch/edit/preview-47.jpg');
 await sharp(source).extract({left:1418,top:330,width:460,height:700}).png().toFile(path.join(assets,'voice-panel.png'));
 txt(s,'“Find three papers about RAG\nand keep the links together.”',100,520,1090,190,57,C.purple,true);
 txt(s,'Speech becomes a request.\nThe hand points to the agent’s own actions.',100,775,1060,130,35,C.muted);
 await pic(s,path.join(assets,'voice-panel.png'),1374,295,414,630);
 notes(s,'App entry is Start conversation or Ctrl+Shift+Space. Live local transcription submits after a pause. The panel still shows a conversation; do not claim there is no chat window. This image is from the scripted demonstration.');
}
// 05. Honest replacement for the original OS / wrappers claim.
{
 const s=base('05-desktop','On your desktop','A hand with its own task window','THINGS runs beside your work as a Windows application.');
 const source=path.join(root,'work/rule-pitch/edit/preview-12.jpg');
 await sharp(source).extract({left:36,top:42,width:1340,height:990}).png().toFile(path.join(assets,'task-browser.png'));
 await pic(s,path.join(assets,'task-browser.png'),100,460,870,493,'cover');
 txt(s,'Browser actions use Chromium input',1070,491,700,100,44,C.ink,true);
 txt(s,'The hand clicks and types inside the task browser, independently of your Windows mouse.',1070,626,700,170,34,C.muted);
 txt(s,'Native Windows tasks pause when input or focus conflicts appear.',1070,829,700,100,30,C.purple);
 notes(s,'Browser path uses CDP input and an injected hand target overlay. Native Windows input uses Win32 and shares system input. THINGS is an Electron application, not an OS kernel component. Source: outputs/THINGS/README.md; electron/browser.cjs; electron/desktop.cjs. Demo crop shows a scripted local task page.');
}
// 06. Replace unsupported performance benchmarks with verified design choices.
{
 const s=base('06-control','User control','You choose what powers it','Connect your own model, follow each action and stop the task when you need to.');
 const items=[['Your API','Poe or a compatible HTTPS endpoint.\nYou choose the model and use your own key.'],['Local voice','Whisper transcribes audio on your computer.\nThe model receives task text and screenshots.'],['Approval before commitment','Final bookings, purchases and public actions\nrequire confirmation.']];
 items.forEach((a,i)=>{const y=482+i*153;txt(s,a[0],100,y,650,90,44,C.purple,true);txt(s,a[1],830,y+2,950,115,32,C.ink);if(i<2)rule(s,100,y+125,1680);});
 notes(s,'No speed or cost benchmark has been established. Keys are encrypted locally using Electron safeStorage. Model compatibility requires image input and tool/function calling. Request caps exist but are not a monetary guarantee. Source: README.md and docs/PROVIDERS.md.');
}
// 07. A large poster for the user to place their video over in Canva.
{
 const s=base('07-demo','Demo','THINGS in action');
 await pic(s,path.join(root,'work/rule-pitch/edit/preview-24.jpg'),384,340,1152,648,'contain');
 txt(s,'Scripted walkthrough with sample data',100,290,1500,45,27,C.muted);
 notes(s,'Replace the poster with outputs/video/THINGS-rule-based-pitch-60s.mp4 in Canva. The clip uses fixed Chromium input actions, prerecorded voice, sample sites, separate takes and time compression. It does not demonstrate live AI reasoning, parallel agents or completed purchases.');
}
// 08. Keep task examples without pretending concurrent agents shipped.
{
 const s=base('08-task-examples','Task examples','One conversation, several requests','The current prototype runs one computer task at a time and queues follow-up requests.');
 const rows=[['Compare flights','Enter a route and dates, then inspect the options.'],['Find lunch','Search a menu and shortlist something to eat.'],['Catch up on updates','Find relevant posts and collect the useful details.'],['Find research papers','Search by topic and open the relevant pages.']];
 rows.forEach((r,i)=>{let y=475+i*115;txt(s,String(i+1).padStart(2,'0'),100,y,90,65,38,C.purple);txt(s,r[0],245,y,605,70,42,C.ink,true);txt(s,r[1],890,y+5,900,70,31,C.muted);if(i<3)rule(s,245,y+84,1530);});
 notes(s,'Task scenarios, not certified completed booking, ordering or X workflows. The rule-based demo uses local sample pages. Real visual tasks can require retries and manual intervention. Parallel agents remain unimplemented.');
}
// 09. Actual closed observation/action loop, native editable shapes.
{
 const s=base('09-pipeline','Technical pipeline','How a request becomes an action','The agent checks the new screen after each step.');
 const a=node(s,'01  Listen','Local microphone audio',100,485,480,145,C.white);
 const b=node(s,'02  Transcribe','faster-whisper on the device',720,485,480,145,C.white);
 const c=node(s,'03  Decide','Task text + screenshot to model',1340,485,480,145,C.light);
 const d=node(s,'06  Observe again','Capture the resulting task window',100,770,480,145,C.white);
 const e=node(s,'05  Act','Click, type or scroll in bounds',720,770,480,145,C.white);
 const f=node(s,'04  Check the action','Validate target and approval needs',1340,770,480,145,C.light);
 link(s,a,b);link(s,b,c);link(s,c,f,'bottom','top');link(s,f,e,'left','right');link(s,e,d,'left','right');
 // Feedback route is above the node row to avoid crossing labels.
 const r1=rect(s,335,687,4,4,C.purple),r2=rect(s,1575,687,4,4,C.purple);
 link(s,d,r1,'top','bottom');link(s,r1,r2,'right','left');link(s,r2,c,'top','bottom');
 txt(s,'Repeat with the latest screen',625,708,650,50,26,C.purple);
 notes(s,'Architecture based on electron/agent.cjs, vision-tools.cjs, vision-policy.cjs, worker speech modules and README.md. Recognition pauses during spoken replies to avoid self-triggering. Node 04 represents policy and approval gating. Frame IDs, bounds checks and stale frame rejection constrain coordinate actions.');
}
// 10. Boundary / component architecture with two real action adapters.
{
 const s=base('10-architecture','System architecture','Inside THINGS');
 txt(s,'ON THE WINDOWS DEVICE',100,318,1100,50,25,C.purple,true);
 txt(s,'YOUR MODEL PROVIDER',1350,318,500,50,25,C.purple,true);
 const ui=node(s,'Desktop companion','React + TypeScript in Electron',100,405,485,145);
 const speech=node(s,'Local speech worker','Python + faster-whisper',100,700,485,145);
 const agent=node(s,'Agent controller','Screenshot loop + policy checks',700,405,485,145,C.light);
 const ai=node(s,'Vision + tool calls','Poe / compatible Chat Completions',1340,405,480,145,C.light);
 const browser=node(s,'Task browser','Chromium CDP input',700,700,485,145);
 link(s,ui,agent);link(s,speech,ui,'top','bottom');
 s.shapes.connect(agent,ai,{kind:'straight',fromSide:'right',toSide:'left',line:{fill:C.purple,width:3},head:{type:'triangle'},tail:{type:'triangle'}});
 link(s,agent,browser,'bottom','top');
 txt(s,'Screenshots + task text',1320,605,530,50,25,C.muted);
 txt(s,'Proposed tool actions',1320,653,530,50,25,C.purple);
 txt(s,'Credentials: Electron safeStorage on the device',100,900,1690,48,29,C.muted);
 txt(s,'Native adapter: Win32 capture + input, with conflict detection',100,945,1690,48,29,C.muted);
 notes(s,'Model sends proposed actions back to the agent controller; actions execute locally. Browser arrows show local controller to CDP adapter; placement does not imply browser executes on the provider. All listed device components are local. Electron wraps Chromium, not direct OS kernel integration. Source: electron/main.cjs, preload.cjs, agent.cjs, browser.cjs, vision-tools.cjs, vision-policy.cjs, worker modules.');
}
// 11. Intended impact and honest current / next distinction.
{
 const s=base('11-impact','Impact and next steps','Less routine clicking\nwhile you work','For someone writing a report, THINGS can take the paper search out of the middle of the writing session.');
 txt(s,'What we built',100,504,710,70,45,C.purple,true);
 txt(s,'Local speech recognition\nAI requests with task screenshots\nBrowser and Windows input adapters\nA visible hand and approval controls',100,610,795,275,35,C.ink);
 txt(s,'What comes next',1030,504,750,70,45,C.purple,true);
 txt(s,'Measure success across longer tasks\nImprove recovery after a wrong action\nAdd parallel task execution',1030,610,750,235,35,C.ink);
 txt(s,'Windows hackathon prototype. Complex tasks may need retries or manual help.',100,929,1680,55,27,C.muted);
 notes(s,'Benefits are intended outcomes, not measured time savings. Real speech, provider requests and controlled input tests exist. Parallel agents and certified end-to-end booking/ordering are not implemented. Source: docs/VALIDATION.md.');
}
// 12. Real supplied portraits, cleaned up without inventing identities.
{
 const s=base('12-team','Our team','The people behind THINGS');
 const source='C:/Users/leeke/AppData/Local/Temp/codex-clipboard-00cf7c53-e7ff-430b-8a7b-d6d4ce30b429.png';
 const team=[
 {name:'Kenny',full:'Lee Ming Hin',role:'Team lead\nFinance & accounting',school:'PolyU, Year 4\nBSc FinTech & AI',crop:{left:133,top:157,width:166,height:138}},
 {name:'Stephanie',full:'Ho Hiu Ching',role:'Software engineer',school:'PolyU, Year 4\nBSc FinTech & AI',crop:{left:405,top:169,width:163,height:126}},
 {name:'Kelvin',full:'Kwok Ka Yip',role:'Software engineer',school:'HKUST, Year 4\nBEng Electronic Engineering',crop:{left:694,top:159,width:166,height:136}},
 {name:'Tony',full:'Li Yuen Chi',role:'Marketing lead\nContent creator',school:'HKBU, Year 4\nBA Creative & Professional Writing',crop:{left:951,top:157,width:175,height:138}}
 ];
 for(const [i,t]of team.entries()){const x=100+i*445,file=path.join(assets,'team-'+i+'.png');await sharp(source).extract(t.crop).resize(600,500,{fit:'cover'}).png().toFile(file);await pic(s,file,x,363,360,300,'cover');txt(s,t.name,x,710,410,70,46,C.ink,true);txt(s,t.full,x,778,410,42,25,C.muted);txt(s,t.role,x,833,420,80,27,C.purple,true);txt(s,t.school,x,920,425,75,23,C.muted);}
 notes(s,'Portraits and biography facts come from the supplied teammate slide. Original full bios: Kenny: 5+ scholarships, 2+ hackathon wins, FWD application management internship in 2026. Stephanie: IT internship at EMSD, marketing internship at KPMG in 2022. Kelvin: HKUST STEAM helper, internship at Liaoning Liaison Unit of HKSAR government. Tony: marketing/video-editing internship in 2025, reality-show general director during Fudan exchange in 2025–26. These are user-supplied statements, not independently verified.');
}

await fs.writeFile(path.join(root,'work/pitch-slides/copy.json'),JSON.stringify(copy,null,2));
for(let i=0;i<P.slides.items.length;i++){const s=P.slides.items[i];const png=await P.export({slide:s,format:'png',scale:1});await fs.writeFile(path.join(out,names[i]+'.png'),new Uint8Array(await png.arrayBuffer()));console.log('rendered',names[i]);}
await(await PresentationFile.exportPptx(P)).save(path.join(root,'work/pitch-slides/candidate.pptx'));
console.log('draft exported');
const {finalizePresentation}=await import(pathToFileURL('C:/Users/leeke/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations/container_tools/artifact_tool_utils.mjs'));
const sd='C:/Users/leeke/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations';
const result=await finalizePresentation({workspaceDir:root,candidatePath:path.join(root,'work/pitch-slides/candidate.pptx'),finalPath:path.join(out,'THINGS-pitch.pptx'),pythonExecutable:runtime+'/python/python.exe',integrityValidatorPath:sd+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:sd+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','18288000,10287000','--validate-heading-fit'],fontPolicy:{basis:'design',families:['Segoe UI']},verifyArtifactToolImport:true,receiptPath:path.join(root,'work/pitch-slides/validation.json')});
console.log(JSON.stringify(result));

