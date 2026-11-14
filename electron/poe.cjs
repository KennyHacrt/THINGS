const sessionBudget={calls:0,maxCalls:30};
function consumeBudget(budget){if(budget.calls>=budget.maxCalls)throw new Error(`AI call limit reached (${budget.maxCalls}). Stopped to protect your Poe credits.`);budget.calls++;}
const ENDPOINT = 'https://api.poe.com/v1/chat/completions';
async function completion({key, model, messages, tools, toolChoice, budget, maxTokens=700, signal, fetchImpl = fetch}) {
  if(typeof key !== 'string' || !key.trim()) throw new Error('Add your Poe API key in settings first.');
  if(fetchImpl===fetch)consumeBudget(sessionBudget);
  if(budget)consumeBudget(budget);
  const response = await fetchImpl(ENDPOINT, {
    method:'POST', headers:{Authorization:`Bearer ${key}`, 'Content-Type':'application/json'},
    body:JSON.stringify({model, messages, ...(tools?.length ? {tools,tool_choice:toolChoice||'auto',parallel_tool_calls:false} : {}), max_tokens:Math.min(700,Math.max(1,maxTokens)), stream:false}),
    signal:AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(90000)]),
  });
  if(!response.ok) {
    const errors={401:'Poe rejected this API key.',402:'Your Poe account has insufficient credits.',404:'Poe could not find this model. Check the exact bot name.',429:'Poe rate limit reached. Please try again shortly.'};
    throw new Error(errors[response.status] || `Poe request failed (HTTP ${response.status}).`);
  }
  const data=await response.json(); const message=data.choices?.[0]?.message;
  if(!message || (!message.content && !message.tool_calls?.length)) throw new Error('Poe returned an empty response.');
  return {message:{role:'assistant',content:message.content || null,...(message.tool_calls?.length ? {tool_calls:message.tool_calls} : {})}, usage:data.usage || {}};
}
module.exports={completion,ENDPOINT,consumeBudget};
