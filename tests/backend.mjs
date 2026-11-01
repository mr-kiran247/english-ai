import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const runtimeRequire=createRequire(path.resolve(process.argv[2] || '.', 'package.json'));
const {PHP}=runtimeRequire('@php-wasm/universal');
const {loadNodeRuntime}=runtimeRequire('@php-wasm/node');
import fs from 'node:fs';
import assert from 'node:assert/strict';
const php=new PHP(await loadNodeRuntime('8.3',{emscriptenOptions:{processId:1}}));
const source=fs.readFileSync(fileURLToPath(new URL('../public/api/translate.php',import.meta.url)),'utf8');
php.mkdir('/site/private');php.mkdir('/site/public_html/api');
php.writeFile('/site/public_html/api/translate.php',source);
let checks=0;
async function run(name,config,expected,status=503,options={}){
 if(config===null){if(php.fileExists('/site/private/englishai-config.php'))php.unlink('/site/private/englishai-config.php');}
 else php.writeFile('/site/private/englishai-config.php',config);
 const result=await php.run({scriptPath:'/site/public_html/api/translate.php',method:'GET',...options});
 assert.equal(result.httpStatusCode,status,`${name}: ${result.text} ${result.errors}`);
 const body=JSON.parse(result.text);
 if(typeof expected==='string')assert.match(body.error,new RegExp(expected));else expected(body);
 assert.ok(!result.text.includes('test-secret'),'Secret leaked');
 console.log('PASS',name);checks++;
}
await run('missing configuration',null,'Configuration not found');
await run('bad syntax','<?php return [;','PHP error');
await run('configuration without return','<?php $x=1;','must return');
await run('missing key',"<?php return ['provider'=>'gemini'];",'real Gemini API key');
await run('placeholder key',"<?php return ['api_key'=>'REPLACE_ON_SERVER_ONLY'];",'real Gemini API key');
await run('invalid provider',"<?php return ['api_key'=>'test-secret','provider'=>'gemini-2.5-flash'];",'Invalid provider');
await run('normalizes provider and models prefix',"<?php return ['api_key'=>'test-secret','provider'=>' Gemini ','model'=>'models/gemini-2.5-flash'];",b=>{assert.equal(b.provider,'gemini');assert.equal(b.model,'gemini-2.5-flash');assert.equal(b.configuration,'loaded')},200);
await run('defaults to Gemini',"<?php return ['api_key'=>'test-secret'];",b=>assert.equal(b.provider,'gemini'),200);
await run('invalid request before any API call',"<?php return ['api_key'=>'test-secret'];",'sentence and source',400,{method:'POST',headers:{'Content-Type':'application/json'},body:new TextEncoder().encode('{}')});
php.mkdir('/site/public_html/englishai/api');php.writeFile('/site/public_html/englishai/api/translate.php',source);
const nested=await php.run({scriptPath:'/site/public_html/englishai/api/translate.php',method:'GET'});
assert.equal(nested.httpStatusCode,200,nested.text);console.log('PASS nested subdomain configuration');checks++;
php.writeFile('/site/private/englishai-config.php',"<?php return ['provider'=>'gemini','api_key'=>'test-secret','model'=>'gemini-0.0-flash'];");
php.writeFile('/site/public_html/api/mock-translate.php',source.replace('declare(strict_types=1);', 'declare(strict_types=1); namespace Fixture; use RuntimeException; use Throwable;'));
const mocks=`<?php namespace Fixture;
foreach (['CURLOPT_HTTPHEADER','CURLOPT_RETURNTRANSFER','CURLOPT_CONNECTTIMEOUT','CURLOPT_TIMEOUT','CURLOPT_SSL_VERIFYPEER','CURLOPT_SSL_VERIFYHOST','CURLOPT_POST','CURLOPT_POSTFIELDS','CURLINFO_HTTP_CODE'] as $i=>$name) defined($name) || define($name,$i+1);
$GLOBALS['calls']=0;
function curl_init($url){return (object)['url'=>$url];}
function curl_setopt_array($curl,$options){$curl->options=$options;if(!in_array($options[CURLOPT_IPRESOLVE],[CURL_IPRESOLVE_V4,CURL_IPRESOLVE_WHATEVER],true))throw new \\Exception('Address selection incorrect');if($options[CURLOPT_HTTP_VERSION]!==CURL_HTTP_VERSION_1_1)throw new \\Exception('HTTP version incorrect');if(!$options[CURLOPT_SSL_VERIFYHOST])throw new \\Exception('TLS hostname verification disabled');if($options[CURLOPT_TIMEOUT]<=20||$options[CURLOPT_TIMEOUT]>65)throw new \\Exception('Timeout budget incorrect');if(!$options[CURLOPT_SSL_VERIFYPEER])throw new \\Exception('TLS verification disabled');return true;}
function curl_exec($curl){
 $i=$GLOBALS['calls']++;
 if($i===0){if(!str_contains($curl->url,'gemini-0.0-flash:generateContent'))throw new \\Exception('Wrong original URL');return '{"error":{"status":"NOT_FOUND"}}';}
 if($i===1){if(!str_contains($curl->url,'/models?pageSize='))throw new \\Exception('Wrong catalog URL');return '{"models":[{"name":"models/gemini-9.0-flash","supportedGenerationMethods":["generateContent"]}]}';}
 if(!str_contains($curl->url,'gemini-9.0-flash:generateContent'))throw new \\Exception('Wrong fallback URL');
 return json_encode(['candidates'=>[['content'=>['parts'=>[['thought'=>true,'text'=>'internal reasoning'],['text'=>json_encode(['en'=>'Have you eaten?','tip'=>'A question about a completed action.'])]]]]]]);
}
function curl_errno($curl){return 0;}
function curl_getinfo($curl,$option){return $GLOBALS['calls']===1?404:200;}
function curl_close($curl){}
require '/site/public_html/api/mock-translate.php';`;
php.writeFile('/site/public_html/api/fixture.php',mocks);
const translated=await php.run({scriptPath:'/site/public_html/api/fixture.php',method:'POST',headers:{'Content-Type':'application/json'},body:new TextEncoder().encode(JSON.stringify({text:'तू जेवण केले का',language:'mr'}))});
assert.equal(translated.httpStatusCode,200,translated.text+' '+translated.errors);
assert.deepEqual(JSON.parse(translated.text),{en:'Have you eaten?',tip:'A question about a completed action.'});
console.log('PASS 404 model discovery, retry and thought filtering (mock provider)');checks++;
// Simulate a connection timeout without waiting or making a network request.
const timeoutMocks=mocks.replace('function curl_errno($curl){return 0;}', 'function curl_errno($curl){return 28;}').replace('return $GLOBALS[\'calls\']===1?404:200;', 'return 0;').replace("$i=$GLOBALS['calls']++;", "file_put_contents('/site/timeout-attempts','1',FILE_APPEND); return false; $i=$GLOBALS['calls']++;");
php.writeFile('/site/public_html/api/timeout.php',timeoutMocks);
const timedOut=await php.run({scriptPath:'/site/public_html/api/timeout.php',method:'POST',headers:{'Content-Type':'application/json'},body:new TextEncoder().encode(JSON.stringify({text:'नमस्कार',language:'mr'}))});
assert.equal(timedOut.httpStatusCode,504,timedOut.text);
assert.match(JSON.parse(timedOut.text).error,/before establishing a connection/);
assert.ok(!timedOut.text.includes('test-secret'));
assert.equal(php.readFileAsText('/site/timeout-attempts'),'11');
console.log('PASS connection timeout diagnostic with one bounded retry and secret redaction');checks++;

php.writeFile('/site/private/englishai-config.php',"<?php return ['provider'=>'gemini','api_key'=>'test-secret','model'=>'gemini-2.5-flash'];");
const successExec=`function curl_exec($curl){
 $payload=json_decode($curl->options[CURLOPT_POSTFIELDS],true);
 if(($payload['generationConfig']['thinkingConfig']['thinkingBudget']??null)!==0)throw new \\Exception('Thinking was not disabled');
 if(($payload['generationConfig']['maxOutputTokens']??0)!==768)throw new \\Exception('Output limit missing');
 if(!in_array('Expect:',$curl->options[CURLOPT_HTTPHEADER],true))throw new \\Exception('Expect header not suppressed');
 return json_encode(['candidates'=>[['content'=>['parts'=>[['text'=>json_encode(['en'=>'Have you eaten?','tip'=>'A question.'])]]]]]]);
}
`;
const fastMocks=mocks.replace(/function curl_exec\(\$curl\)\{[\s\S]*?\nfunction curl_errno/,successExec+'function curl_errno');
php.writeFile('/site/public_html/api/fast.php',fastMocks);
const post={method:'POST',headers:{'Content-Type':'application/json'},body:new TextEncoder().encode(JSON.stringify({text:'तू जेवण केले का',language:'mr'}))};
const fast=await php.run({scriptPath:'/site/public_html/api/fast.php',...post});
assert.equal(fast.httpStatusCode,200,fast.text+' '+fast.errors);
assert.equal(JSON.parse(fast.text).en,'Have you eaten?');
console.log('PASS Gemini thinking disabled, output bounded, HTTP/1.1, TLS enabled');checks++;
const tlsMocks=timeoutMocks.replace("function curl_getinfo($curl,$option){return 0;}","function curl_getinfo($curl,$option){return $option===CURLINFO_CONNECT_TIME?1:0;}");
php.writeFile('/site/public_html/api/tls.php',tlsMocks);
const tls=await php.run({scriptPath:'/site/public_html/api/tls.php',...post});
assert.equal(tls.httpStatusCode,504,tls.text);assert.match(JSON.parse(tls.text).error,/TLS handshake timed out/);
console.log('PASS TLS stall distinguished from generation timeout');checks++;
const responseMocks=timeoutMocks.replace("function curl_getinfo($curl,$option){return 0;}","function curl_getinfo($curl,$option){return in_array($option,[CURLINFO_CONNECT_TIME,CURLINFO_APPCONNECT_TIME],true)?1:0;}");
php.writeFile('/site/public_html/api/response-timeout.php',responseMocks);
const delayed=await php.run({scriptPath:'/site/public_html/api/response-timeout.php',...post});
assert.equal(delayed.httpStatusCode,504,delayed.text);assert.match(JSON.parse(delayed.text).error,/TLS succeeded/);
console.log('PASS connected TLS with no response diagnosed separately');checks++;
const retryMocks=fastMocks.replace("$payload=json_decode", "if($GLOBALS['calls']++===0)return false; $payload=json_decode").replace("function curl_errno($curl){return 0;}","function curl_errno($curl){return $GLOBALS['calls']===1?28:0;}");
php.writeFile('/site/public_html/api/retry.php',retryMocks);
const recovered=await php.run({scriptPath:'/site/public_html/api/retry.php',...post});
assert.equal(recovered.httpStatusCode,200,recovered.text+' '+recovered.errors);
assert.equal(JSON.parse(recovered.text).en,'Have you eaten?');
console.log('PASS transient timeout recovered by retry');checks++;
console.log(`${checks} PHP runtime checks passed`);
php.exit();
