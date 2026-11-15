const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {endpoint,connection}=require('../electron/providers.cjs'),{completion}=require('../electron/poe.cjs'),{createKeyStore}=require('../electron/key-store.cjs');
test('custom API base URLs normalize without allowing credentials or insecure transport',()=>{
 assert.equal(endpoint({provider:'custom',baseUrl:'https://gateway.example/v1/'}),'https://gateway.example/v1/chat/completions');
 assert.equal(endpoint({provider:'custom',baseUrl:'https://gateway.example/v1/chat/completions'}),'https://gateway.example/v1/chat/completions');
 for(const baseUrl of ['http://gateway.example','https://user:secret@gateway.example/v1','https://gateway.example/v1?key=secret','https://gateway.example/v1#x'])assert.throws(()=>connection({provider:'custom',baseUrl}));
 assert.equal(endpoint({provider:'poe',baseUrl:'https://other.example'}),'https://api.poe.com/v1/chat/completions');
});
test('text, images, tools and selected model reach only the configured API',async()=>{
 let sent;const image='data:image/jpeg;base64,fixture';const messages=[{role:'user',content:[{type:'text',text:'Read test screenshot'},{type:'image_url',image_url:{url:image}}]}];
 const result=await completion({key:'fixture-only-key',model:'team/visual-model',connection:{provider:'custom',baseUrl:'https://gateway.example/v1'},messages,tools:[{type:'function',function:{name:'check',parameters:{type:'object',properties:{}}}}],fetchImpl:async(url,options)=>{sent={url,options};return {ok:true,json:async()=>({choices:[{message:{tool_calls:[{id:'1',function:{name:'check',arguments:'{}'}}]}}]})};}});
 assert.equal(sent.url,'https://gateway.example/v1/chat/completions');assert.equal(sent.options.redirect,'error');const body=JSON.parse(sent.options.body);assert.equal(body.model,'team/visual-model');assert.deepEqual(body.messages,messages);assert.equal(body.tools[0].function.name,'check');assert.equal(result.message.tool_calls.length,1);
});
test('changing endpoints cannot silently reuse an encrypted key',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'things-keys-'));const safeStorage={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()};const store=createKeyStore({safeStorage,directory});
 store.save({apiKey:'fixture-poe-key',model:'gpt-4.1-mini'});assert.equal(store.config().provider,'poe');
 assert.throws(()=>store.save({provider:'custom',baseUrl:'https://gateway.example/v1',model:'team/model'}),/not reused/);
 store.save({provider:'custom',baseUrl:'https://gateway.example/v1',model:'team/model',apiKey:'fixture-other-key'});assert.equal(store.key(),'fixture-other-key');assert.ok(!JSON.stringify(store.config()).includes('fixture-other-key'));
 assert.throws(()=>store.save({provider:'custom',baseUrl:'https://second.example/v1',model:'model'}),/not reused/);
});
