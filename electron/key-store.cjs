const fs=require('node:fs');
const path=require('node:path');
function createKeyStore({safeStorage,directory}) {
  const file=path.join(directory,'poe-settings.json');
  function read() { try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return {};}}
  function config() {const data=read();return {configured:!!data.encryptedKey,model:typeof data.model==='string' ? data.model:'gpt-4.1-mini'};}
  function key() {const data=read(); if(!data.encryptedKey) return '';if(!safeStorage.isEncryptionAvailable()) throw new Error('OS credential encryption is unavailable.');return safeStorage.decryptString(Buffer.from(data.encryptedKey,'base64'));}
  function save({apiKey,model}) {
    if(typeof model!=='string'||!/^[\w.\-]{1,100}$/.test(model)) throw new Error('Enter a valid Poe model name.');
    const data=read();
    if(apiKey) {
      if(typeof apiKey!=='string'||apiKey.length<20||apiKey.length>512||/[\s\r\n]/.test(apiKey)) throw new Error('Enter a valid Poe key.');
      if(!safeStorage.isEncryptionAvailable()) throw new Error('OS credential encryption is unavailable. The key was not saved.');
      data.encryptedKey=safeStorage.encryptString(apiKey).toString('base64');
    }
    data.model=model;fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(file+'.tmp',JSON.stringify(data),{mode:0o600});fs.renameSync(file+'.tmp',file);return config();
  }
  return {config,key,save};
}
module.exports={createKeyStore};
