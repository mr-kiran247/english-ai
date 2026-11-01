import test from 'node:test';
import assert from 'node:assert/strict';
import {requestLesson} from '../src/translation.js';
import {createWorker} from '../cloudflare/worker.js';
const origin='https://englishai.technokiran.online';
const endpoint='https://englishai-api.kiran-sontakke247work.workers.dev/translate';
const lesson={en:'Where had you gone?',tip:'Ask about a past action.'};
const args={text:'कुठे गेला होता',language:'mr',origin,endpoint};
test('cross-origin request is preflight-free and excludes cookies',async()=>{
 const result=await requestLesson({...args,fetchImpl:async(url,options)=>{
 assert.equal(url,endpoint);assert.equal(options.mode,'cors');assert.equal(options.credentials,'omit');
 assert.equal(options.headers['Content-Type'],'text/plain;charset=UTF-8');assert.equal(Object.keys(options.headers).length,1);
 assert.equal(JSON.parse(options.body).language,'mr');return Response.json(lesson);
 }});assert.deepEqual(result,lesson);
});
test('PHP rollback keeps application/json for same-origin endpoint',async()=>{
 await requestLesson({...args,endpoint:'/api/translate.php',fetchImpl:async(url,options)=>{
 assert.equal(url,origin+'/api/translate.php');assert.equal(options.headers['Content-Type'],'application/json');return Response.json(lesson);
 }});
});
test('network failure identifies exact website and endpoint',async()=>{
 await assert.rejects(requestLesson({...args,fetchImpl:async()=>{throw new TypeError('Failed to fetch')}}),error=>error.message.includes(origin)&&error.message.includes(new URL(endpoint).origin));
});
test('login HTML is diagnosed rather than treated as translation',async()=>{
 await assert.rejects(requestLesson({...args,fetchImpl:async()=>new Response('<html>Login</html>')}),/did not return JSON/);
});
test('provider errors and aborts are preserved',async()=>{
 await assert.rejects(requestLesson({...args,fetchImpl:async()=>Response.json({error:'Quota reached'},{status:503})}),/Quota reached/);
 await assert.rejects(requestLesson({...args,fetchImpl:async()=>{throw new DOMException('Cancelled','AbortError')}}),{name:'AbortError'});
});
test('frontend request is accepted by actual Worker handler',async()=>{
 const worker=createWorker(async()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify(lesson)}]}}]}));
 const result=await requestLesson({...args,fetchImpl:async(url,options)=>{
 const response=await worker.fetch(new Request(url,{...options,headers:{...options.headers,Origin:origin}}),{GEMINI_API_KEY:'test-key'});
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);return response;
 }});assert.deepEqual(result,lesson);
});
