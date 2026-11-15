const fs=require('node:fs'),path=require('node:path');
function workerSpec(name){
  if(!['voice_worker.py','screen_worker.py'].includes(name))throw new Error('Unknown worker.');
  const bundled=process.resourcesPath&&fs.existsSync(path.join(process.resourcesPath,'python','python.exe'));
  const python=bundled?path.join(process.resourcesPath,'python','python.exe'):path.join(__dirname,'..','.desktop-env','Scripts','python.exe');
  const script=bundled?path.join(process.resourcesPath,'workers',name):path.join(__dirname,name);
  return {python,script,env:{...process.env,...(bundled?{THINGS_MODEL_DIR:path.join(process.resourcesPath,'models','base')}:{})}};
}
module.exports={workerSpec};
