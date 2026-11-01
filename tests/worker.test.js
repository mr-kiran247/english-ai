import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker} from '../cloudflare/worker.js';
const origin='https://englishai.technokiran.online';
const key='test-only-secret';
const env={GEMINI_API_KEY:key};
const post=(body={text:'तू जेवण केले का',language:'mr'},extra={})=>new Request('https://test.workers.dev/translate',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
const lesson={en:'Have you eaten?',tip:'A question about a completed action.'};
const googleSuccess=()=>Response.json({candidates:[{content:{parts:[{thought:true,text:'private thinking'},{text:JSON.stringify(lesson)}]}}]});
test('GET reports configuration presence without exposing keys',async()=>{
 const response=await createWorker().fetch(new Request('https://test.workers.dev/'),env);
 const body=await response.json();assert.equal(body.status,'configured');assert.ok(!JSON.stringify(body).includes(key));
});
test('CORS preflight allows the deployed website',async()=>{
 const r=await createWorker().fetch(new Request('https://test.workers.dev/translate',{method:'OPTIONS',headers:{Origin:origin}}),{});
 assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
});
test('rejects unrelated browser origins',async()=>{
 const r=await createWorker().fetch(post(undefined,{Origin:'https://other.example'}),env);assert.equal(r.status,403);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
});
test('missing key gives configuration error without calling Google',async()=>{
 const worker=createWorker(()=>assert.fail('Unexpected Google call'));
 const r=await worker.fetch(post(),{});assert.equal(r.status,503);assert.match((await r.json()).error,/GEMINI_API_KEY/);
});
test('invalid input is rejected before using provider quota',async()=>{
 for(const body of [{text:'',language:'mr'},{text:'hello',language:'xx'},{text:'a'.repeat(1001),language:'hi'},null]){
 const r=await createWorker(()=>assert.fail()).fetch(post(body),env);assert.equal(r.status,400);
 }
});
test('rejects oversized actual body',async()=>{
 const r=await createWorker(()=>assert.fail()).fetch(post({text:'a'.repeat(1450001),language:'hi'}),env);assert.equal(r.status,413);
});
test('translation uses Gemini 3.5 with bounded output and compatible parameters',async()=>{
 const worker=createWorker(async(url,options)=>{
 assert.match(url,/gemini-3\.5-flash-lite:generateContent$/);
 assert.equal(options.headers['x-goog-api-key'],key);
 const payload=JSON.parse(options.body);assert.equal(payload.generationConfig.thinkingConfig,undefined);assert.equal(payload.generationConfig.maxOutputTokens,768);
 assert.equal(payload.contents[0].parts[0].text,'तू जेवण केले का');return googleSuccess();
 });
 const r=await worker.fetch(post(),env);assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);assert.deepEqual(await r.json(),lesson);
});
test('404 discovers an advertised model and retries with compatible config',async()=>{
 let calls=0;const worker=createWorker(async(url,options)=>{
 calls++;if(calls===1)return Response.json({}, {status:404});
 if(calls===2){assert.match(url,/models\?pageSize/);return Response.json({models:[{name:'models/gemini-9.0-flash',supportedGenerationMethods:['generateContent']}]});}
 assert.match(url,/gemini-9\.0-flash:generateContent/);assert.equal(JSON.parse(options.body).generationConfig.thinkingConfig,undefined);return googleSuccess();
 });const r=await worker.fetch(post(),env);assert.equal(r.status,200);assert.equal(calls,3);assert.deepEqual(await r.json(),lesson);
});
test('provider quota and credential errors remain distinct',async()=>{
 for(const [status,expected] of [[429,/quota/],[403,/API key/],[404,/model/]]){
 const r=await createWorker(async()=>Response.json({}, {status})).fetch(post(),env);assert.match((await r.json()).error,expected);
 }
});
test('malformed AI output is not presented as a translation',async()=>{
 const r=await createWorker(async()=>Response.json({candidates:[]})).fetch(post(),env);assert.equal(r.status,502);assert.match((await r.json()).error,/incomplete/);
});
test('network errors do not leak credentials or raw upstream messages',async()=>{
 const r=await createWorker(async()=>{throw new Error(key)}).fetch(post(),env);assert.equal(r.status,502);assert.ok(!(await r.text()).includes(key));
});
test('optional rate limiter blocks requests before Google',async()=>{
 const r=await createWorker(()=>assert.fail()).fetch(post(),{...env,TRANSLATION_LIMITER:{limit:async()=>({success:false})}});assert.equal(r.status,429);
});

test('allows owned HTTPS domain variants but rejects lookalikes and HTTP',async()=>{
 for(const site of ['https://technokiran.online','https://www.technokiran.online','https://www.englishai.technokiran.online']){
 const r=await createWorker().fetch(new Request('https://test.workers.dev/',{headers:{Origin:site}}),env);
 assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),site);
 }
 for(const site of ['https://technokiran.online.evil.example','http://englishai.technokiran.online']){
 const r=await createWorker().fetch(new Request('https://test.workers.dev/',{headers:{Origin:site}}),env);assert.equal(r.status,403);
 }
});

test('model timeout recovers with a different Gemini model',async()=>{
 const urls=[];const worker=createWorker(async(url,options)=>{
 urls.push(url);if(urls.length===1)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')),{once:true}));
 return googleSuccess();
 },{translationMs:5});
 const r=await worker.fetch(post(),env);assert.equal(r.status,200);assert.equal(urls.length,2);assert.notEqual(urls[0],urls[1]);
});
test('two stalled models return bounded timeout with connection-check instructions',async()=>{
 let calls=0;const worker=createWorker(async(url,options)=>{
 calls++;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')),{once:true}));
 },{translationMs:5});
 const r=await worker.fetch(post(),env);assert.equal(r.status,504);assert.equal(calls,2);assert.match((await r.json()).error,/check=google/);
});
test('Google connection check advertises models without exposing credentials',async()=>{
 const worker=createWorker(async(url,options)=>{
 assert.match(url,/models\?pageSize/);assert.equal(options.headers['x-goog-api-key'],key);
 return Response.json({models:[{name:'models/gemini-2.5-flash-lite',supportedGenerationMethods:['generateContent']}]});
 });
 const r=await worker.fetch(new Request('https://test.workers.dev/?check=google'),env);const body=await r.json();
 assert.equal(body.google,'reachable');assert.deepEqual(body.available_models,['gemini-2.5-flash-lite']);assert.ok(!JSON.stringify(body).includes(key));
});
test('model catalog timeout is distinguished from slow sentence generation',async()=>{
 const worker=createWorker(async(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')),{once:true})),{checkMs:5});
 const r=await worker.fetch(new Request('https://test.workers.dev/?check=google'),env);assert.equal(r.status,504);const body=await r.json();assert.equal(body.stage,'model_catalog');assert.equal(body.google,'unreachable');
});
test('Google diagnostic distinguishes invalid credentials from reachability',async()=>{
 const worker=createWorker(async()=>Response.json({error:{status:'PERMISSION_DENIED'}},{status:403}));
 const r=await worker.fetch(new Request('https://test.workers.dev/?check=google'),env);const body=await r.json();assert.equal(body.google,'rejected');assert.equal(body.http_status,403);
});

test('404 recovery uses advertised latest aliases and never repeats failed model',async()=>{
 const urls=[];const worker=createWorker(async(url)=>{
 urls.push(url);
 if(url.includes('models?pageSize'))return Response.json({models:[
 {name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:['generateContent']},
 {name:'models/gemini-flash-lite-latest',supportedGenerationMethods:['generateContent']},
 ]});
 if(url.includes('gemini-3.5-flash-lite:'))return Response.json({error:{message:'model not found'}},{status:404});
 assert.match(url,/gemini-flash-lite-latest:generateContent$/);return googleSuccess();
 });
 const r=await worker.fetch(post(),{...env,GEMINI_MODEL:'gemini-3.5-flash-lite'});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),lesson);assert.equal(urls.length,3);
});
test('generation 404 preserves redacted provider reason instead of claiming no models',async()=>{
 const worker=createWorker(async(url)=>{
 if(url.includes('models?pageSize'))return Response.json({models:[]});
 return Response.json({error:{message:`Requested model is not supported. key=${key}`}},{status:404});
 });
 const r=await worker.fetch(post(),env);const body=await r.json();
 assert.equal(r.status,502);assert.equal(body.version,'speakstep-worker-6');assert.match(body.error,/Requested model is not supported/);
 assert.ok(!JSON.stringify(body).includes(key));assert.deepEqual(body.attempted_models,['gemini-3.5-flash-lite']);
});

test('retired Gemini 2.5 Flash-Lite override migrates to provider-recommended 3.5',async()=>{
 const urls=[];const worker=createWorker(async(url,options)=>{
 urls.push(url);assert.match(url,/gemini-3\.5-flash-lite:generateContent$/);
 assert.equal(JSON.parse(options.body).generationConfig.thinkingConfig,undefined);
 return googleSuccess();
 });
 const r=await worker.fetch(post(),{...env,GEMINI_MODEL:'models/gemini-2.5-flash-lite'});assert.equal(r.status,200);assert.equal(urls.length,1);
});

test('Safari MP4 audio is sent to Gemini with a source transcript',async()=>{
 const worker=createWorker(async(url,options)=>{
 const body=JSON.parse(options.body);assert.deepEqual(body.contents[0].parts,[{inlineData:{mimeType:'audio/mp4',data:'AQIDBA=='}}]);
 assert.match(body.systemInstruction.parts[0].text,/transcript/);
 return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({...lesson,transcript:'तू जेवण केले का'})}]}}]});
 });
 const r=await worker.fetch(post({language:'mr',audio:{mimeType:'audio/mp4',data:'AQIDBA=='}}),env);assert.equal(r.status,200);assert.equal((await r.json()).transcript,'तू जेवण केले का');
});
test('malformed and oversized audio is rejected before Gemini',async()=>{
 for(const audio of [{mimeType:'text/plain',data:'AQIDBA=='},{mimeType:'audio/mp4',data:'invalid%%%'}]){
 const r=await createWorker(()=>assert.fail()).fetch(post({language:'mr',audio}),env);assert.equal(r.status,400);
 }
});
test('unintelligible recording is not presented as a transcript',async()=>{
 const worker=createWorker(async()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify({...lesson,transcript:''})}]}}]}));
 const r=await worker.fetch(post({language:'mr',audio:{mimeType:'audio/mp4',data:'AQIDBA=='}}),env);assert.equal(r.status,422);
});
