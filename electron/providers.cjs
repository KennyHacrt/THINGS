const POE_BASE='https://api.poe.com/v1';
function connection(value={}){
  const provider=value.provider||'poe';
  if(!['poe','custom'].includes(provider))throw new Error('Choose Poe or a compatible API.');
  if(provider==='poe')return {provider,baseUrl:POE_BASE};
  let url;try{url=new URL(value.baseUrl);}catch{throw new Error('Enter the API base URL supplied by your provider.');}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('Use an HTTPS API base URL without credentials, query or fragment.');
  let baseUrl=url.href.replace(/\/+$/,'').replace(/\/chat\/completions$/,'');
  return {provider,baseUrl};
}
function endpoint(value){return connection(value).baseUrl+'/chat/completions';}
module.exports={POE_BASE,connection,endpoint};
