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
 const r=await createWorker(()=>assert.fail()).fetch(post({text:'a'.repeat(9000),language:'hi'}),env);assert.equal(r.status,413);
});
test('translation uses secret server-side, bounded output and no thinking',async()=>{
 const worker=createWorker(async(url,options)=>{
 assert.match(url,/gemini-2\.5-flash:generateContent$/);
 assert.equal(options.headers['x-goog-api-key'],key);
 const payload=JSON.parse(options.body);assert.equal(payload.generationConfig.thinkingConfig.thinkingBudget,0);assert.equal(payload.generationConfig.maxOutputTokens,768);
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
