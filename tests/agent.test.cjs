const test=require('node:test');const assert=require('node:assert/strict');
const {Agent}=require('../electron/agent.cjs');const {safeUrl}=require('../electron/browser.cjs');
const {completion}=require('../electron/poe.cjs');
const tool={type:'function',function:{name:'browser_inspect',parameters:{type:'object',properties:{},required:[]}}};
function create(overrides={}) {const events=[];const calls=[];const queue=[{role:'assistant',content:null,tool_calls:[{id:'1',function:{name:'browser_inspect',arguments:'{}'}}]},{role:'assistant',content:'Observed Example Domain at https://example.com.'}];const agent=new Agent({tools:()=>[tool],execute:async(name,args)=>{calls.push({name,args});return {title:'Example Domain'};},credentials:{config:()=>({model:'test-model'}),key:()=> 'test-placeholder-only'},onEvent:e=>events.push(e),onActivity:()=>{},requestApproval:async()=>true,complete:async()=>({message:queue.shift(),usage:{}}),...overrides});return {agent,events,calls};}
test('real tool loop executes observations before completing',async()=>{const {agent,events,calls}=create();const r=await agent.start('Read example.com',{mode:'browser'});assert.match(r.result,/Example Domain/);assert.equal(calls.length,1);assert.ok(events.some(e=>e.type==='observation'));assert.equal(agent.run,null);});
test('model cannot claim success without using a computer tool',async()=>{const {agent,events}=create({complete:async()=>({message:{role:'assistant',content:'Done'},usage:{}})});await assert.rejects(agent.start('task',{mode:'browser'}),/No computer action was verified/);assert.ok(events.some(e=>e.type==='failed'));});
test('desktop conversation carries previous turns and can answer without inventing computer actions',async()=>{
  const history=[{role:'user',content:'Plan a Tokyo trip.'},{role:'assistant',content:'Which dates?'}];let received;
  const {agent,calls}=create({complete:async({messages})=>{received=messages;return {message:{role:'assistant',content:'Got it, December 12–15. What budget would you like?'},usage:{}};}});
  const result=await agent.start('December 12–15',{mode:'desktop',conversation:true},history);
  assert.equal(received[1].content,history[0].content);assert.equal(received[2].content,history[1].content);assert.match(result.result,/budget/);assert.equal(calls.length,0);
});
test('unknown tools and unexpected fields never reach executor',async()=>{for(const fn of [{name:'run_shell',arguments:'{}'},{name:'browser_inspect',arguments:'{"code":"evil"}'}]){const {agent,calls}=create({complete:async()=>({message:{role:'assistant',tool_calls:[{id:'x',function:fn}]},usage:{}})});await assert.rejects(agent.start('task',{mode:'browser'}));assert.equal(calls.length,0);}});
test('declined input action does not execute',async()=>{const inputTool={type:'function',function:{name:'browser_type',parameters:{type:'object',properties:{text:{type:'string'}},required:['text']}}};const {agent,calls}=create({tools:()=>[inputTool],requestApproval:async()=>false,complete:async()=>({message:{role:'assistant',tool_calls:[{id:'x',function:{name:'browser_type',arguments:'{"text":"hello"}'}}]},usage:{}})});await assert.rejects(agent.start('task',{mode:'browser'}),/declined/);assert.deepEqual(calls.map(c=>c.name),['describe_action']);});
test('cancellation after pending model response prevents tool execution',async()=>{let resolve;const {agent,calls,events}=create({complete:()=>new Promise(r=>resolve=r)});const task=agent.start('task',{mode:'browser'});await new Promise(r=>setImmediate(r));agent.stop();resolve({message:{role:'assistant',tool_calls:[{id:'x',function:{name:'browser_inspect',arguments:'{}'}}]},usage:{}});await assert.rejects(task,/stopped/);assert.equal(calls.length,0);assert.ok(events.some(e=>e.type==='stopped'));});
test('browser tool refuses local schemes, private hosts and embedded credentials',()=>{for(const url of ['file:///etc/passwd','javascript:alert(1)','http://localhost','http://127.0.0.1','http://[::1]','http://printer.local','https://user:pass@example.com'])assert.throws(()=>safeUrl(url));assert.equal(safeUrl('https://example.com'),'https://example.com/');});
test('Poe authentication failures never echo response body or supplied key',async()=>{const key='test-sensitive-placeholder';await assert.rejects(completion({key,model:'test',messages:[],fetchImpl:async()=>({ok:false,status:401,json:async()=>({error:key})})}),error=>!error.message.includes(key)&&/rejected/.test(error.message));});


test('spoken search cannot complete as a chatbot answer without verified actions',async()=>{
 const {agent,events,calls}=create({complete:async()=>({message:{role:'assistant',content:'Here are papers from memory'},usage:{}})});
 await assert.rejects(agent.start('Find research papers about RAG',{mode:'desktop',conversation:true}),/No computer action was executed/);
 assert.equal(calls.length,0);assert.ok(!events.some(e=>e.type==='completed'));
});
test('spoken task requires tools until navigation succeeds; greetings stay conversational',async()=>{
 const toolChoices=[];let turn=0;
 const {agent,calls}=create({tools:()=>[{type:'function',function:{name:'browser_search',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}}],complete:async({toolChoice})=>{toolChoices.push(toolChoice);return {message:turn++===0?{role:'assistant',tool_calls:[{id:'s',function:{name:'browser_search',arguments:'{"query":"RAG papers"}'}}]}:{role:'assistant',content:'Observed search results.'},usage:{}};}});
 await agent.start('Search for RAG papers',{mode:'browser',conversation:true});assert.deepEqual(toolChoices,['required',undefined]);assert.equal(calls.length,1);
});

test('input conflict pauses execution and notifies before retry can continue',async()=>{
 const tool={type:'function',function:{name:'computer',parameters:{type:'object',properties:{target:{type:'string'},action:{type:'string'},frame:{type:'string'},x:{type:'number'},y:{type:'number'},reason:{type:'string'}},required:['target','action','frame']}}};let turn=0,agent;const events=[];
 agent=new Agent({credentials:{config:()=>({model:'test'}),key:()=> 'test-only'},tools:()=>[tool],onActivity:()=>{},onEvent:e=>{events.push(e);if(e.type==='conflict')setImmediate(()=>agent.pause());},requestApproval:async()=>true,assess:async()=> 'ROUTINE',complete:async()=>({message:turn++===0?{role:'assistant',tool_calls:[{id:'1',function:{name:'computer',arguments:'{"target":"desktop","action":"click","frame":"f1","x":1,"y":1,"reason":"Click test"}'}}]}:{role:'assistant',content:'The input was not executed.'},usage:{}}),execute:async()=>{throw Error('CONFLICT: Another window is active.');}});
 await agent.start('Check the selected window',{mode:'desktop',conversation:true});assert.ok(events.some(e=>e.type==='conflict'));assert.ok(events.some(e=>e.type==='resumed'));
});

test('shared planning and safety-check budget blocks the next request before transmission',async()=>{
 const {completion}=require('../electron/poe.cjs');const budget={calls:0,maxCalls:2};let sent=0;
 const fetchImpl=async()=>{sent++;return {ok:true,json:async()=>({choices:[{message:{content:'OK'}}]})};};
 await completion({key:'test-only',model:'gpt-4.1-mini',messages:[],budget,fetchImpl});
 await completion({key:'test-only',model:'gpt-4.1-mini',messages:[],budget,maxTokens:80,fetchImpl});
 await assert.rejects(completion({key:'test-only',model:'gpt-4.1-mini',messages:[],budget,fetchImpl}),/AI call limit reached/);assert.equal(sent,2);
});
