'use strict';
const http=require('http');
const fs=require('fs');
const path=require('path');
const ROOT=__dirname;
const PORT=Number(process.env.PORT||8787);
loadEnv(path.join(ROOT,'.env'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml'};

function loadEnv(file){
  if(!fs.existsSync(file))return;
  for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){
    const match=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if(!match||process.env[match[1]])continue;
    process.env[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');
  }
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
function readJson(req){return new Promise((resolve,reject)=>{let body='';req.on('data',chunk=>{body+=chunk;if(body.length>65536){reject(new Error('Request is too large.'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(body||'{}'))}catch{reject(new Error('Invalid request.'))}});req.on('error',reject)})}
function outputText(data){if(typeof data.output_text==='string'&&data.output_text)return data.output_text;return(data.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('\n').trim()}

async function chat(req,res){
  if(!process.env.OPENAI_API_KEY)return json(res,503,{error:'Add your OpenAI API key to the .env file, save it, and restart the server.'});
  try{
    const body=await readJson(req);
    const artist=String(body.artist||'the selected artist').slice(0,80);
    const mode=body.mode==='general'?'general':'artist';
    const messages=Array.isArray(body.messages)?body.messages.slice(-10).map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.content||'').slice(0,2000)})):[];
    if(!messages.length)return json(res,400,{error:'Please enter a question.'});
    const instructions=mode==='general'?`You are Khila's friendly general-purpose AI assistant. Help with questions, explanations, brainstorming, planning, writing, studying, and safe everyday tasks. Use web search for current information and prefer reliable sources. Keep answers warm, age-appropriate, clear, and concise. Do not claim to be a human, facilitate harmful activity, make purchases, or expose private information.`:`You are Khila's friendly music and culture research guide. Answer questions about ${artist} using public information. You are not the artist and must never claim to be, speak as, or privately know the artist. Clearly distinguish verified facts from uncertainty. For current concert, touring, release, or social information, use web search and prefer official sources. Keep answers warm, age-appropriate, concise, and avoid gossip presented as fact. Never facilitate purchases or expose private personal information.`;
    const apiResponse=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',instructions,input:messages,tools:[{type:'web_search'}],reasoning:{effort:'low'},text:{verbosity:'medium'}})});
    const data=await apiResponse.json();
    if(!apiResponse.ok){console.error('OpenAI error:',data.error?.message||apiResponse.status);return json(res,502,{error:data.error?.message||'OpenAI could not answer right now.'})}
    return json(res,200,{reply:outputText(data)||'I could not create an answer. Please try again.'});
  }catch(error){console.error(error);return json(res,500,{error:error.message||'Unexpected server error.'})}
}

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(url.pathname==='/api/chat'&&req.method==='POST')return chat(req,res);
  if(url.pathname==='/api/status')return json(res,200,{ready:Boolean(process.env.OPENAI_API_KEY),model:process.env.OPENAI_MODEL||'gpt-5.6-luna'});
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
  const requested=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const file=path.resolve(ROOT,requested);
  if(!file.startsWith(ROOT+path.sep)||path.basename(file).startsWith('.'))return json(res,404,{error:'Not found.'});
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile())return json(res,404,{error:'Not found.'});
    res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; img-src 'self' https://images.unsplash.com https://img.youtube.com data:; connect-src 'self' https://api.open-meteo.com; style-src 'self'; script-src 'self'; font-src 'self'; frame-ancestors 'none'"});
    if(req.method==='HEAD')return res.end();
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Khila's World is running at http://localhost:${PORT}`));
