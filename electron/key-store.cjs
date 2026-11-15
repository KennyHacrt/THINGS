const {connection}=require('./providers.cjs');
const fs=require('node:fs');
const path=require('node:path');
function createKeyStore({safeStorage,directory}) {
  const file=path.join(directory,'poe-settings.json');
  function read() { try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return {};}}
  function config() {const data=read(),target=connection(data);return {...target,configured:!!data.encryptedKey&&(data.keyEndpoint||connection().baseUrl)===target.baseUrl,model:typeof data.model==='string'?data.model:'gpt-4.1-mini'};}
  function key() {const data=read();if(!config().configured)return '';if(!safeStorage.isEncryptionAvailable())throw new Error('OS credential encryption is unavailable.');return safeStorage.decryptString(Buffer.from(data.encryptedKey,'base64'));}
  function save({apiKey,model,provider='poe',baseUrl}) {
    if(typeof model!=='string'||! /^(?!.*\s)[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(model))throw new Error('Enter the exact model or bot ID supplied by your provider.');
    const target=connection({provider,baseUrl}),data=read();
    const savedEndpoint=data.keyEndpoint||connection().baseUrl;
    if((savedEndpoint!==target.baseUrl||!data.encryptedKey)&&!apiKey)throw new Error('Enter an API key for this endpoint. Keys are not reused across providers.');
    if(apiKey){
      if(typeof apiKey!=='string'||apiKey.length<8||apiKey.length>512||/\s/.test(apiKey))throw new Error('Enter a valid API key.');
      if(!safeStorage.isEncryptionAvailable())throw new Error('OS credential encryption is unavailable. The key was not saved.');
      data.encryptedKey=safeStorage.encryptString(apiKey).toString('base64');
    }
    Object.assign(data,target,{model,keyEndpoint:target.baseUrl});fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(file+'.tmp',JSON.stringify(data),{mode:0o600});fs.renameSync(file+'.tmp',file);return config();
  }
  return {config,key,save};
}
module.exports={createKeyStore};
