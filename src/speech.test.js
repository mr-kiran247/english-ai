import test from 'node:test';
import assert from 'node:assert/strict';
import {startSpeech, speechError} from './speech.js';

function setup(overrides={}) {
 let instance;
 class Recognition {
  constructor(){instance=this;}
  start(){this.started=true;}
  abort(){this.aborted=true;}
 }
 const states=[],errors=[],texts=[];
 const stop=startSpeech({browser:{isSecureContext:true,webkitSpeechRecognition:Recognition,...overrides},language:'mr-IN',onText:t=>texts.push(t),onStatus:s=>states.push(s),onError:e=>errors.push(e)});
 return {instance,states,errors,texts,stop};
}
test('uses Safari prefixed API and starts during the tap handler',()=>{
 const {instance,states}=setup();
 assert.equal(instance.started,true);assert.equal(instance.lang,'mr-IN');
 assert.equal(instance.continuous,false);assert.deepEqual(states,['starting']);
});
test('returns transcription and ends the recording state',()=>{
 const {instance,states,texts,errors}=setup();
 instance.onstart();instance.onresult({results:[[{transcript:'मला घरी जायचे आहे'}]]});instance.onend();
 assert.deepEqual(texts,['मला घरी जायचे आहे']);assert.deepEqual(states,['starting','listening','idle']);assert.deepEqual(errors,[]);
});
test('preserves network errors instead of replacing them with no-speech',()=>{
 const {instance,errors}=setup();instance.onerror({error:'network'});instance.onend();
 assert.deepEqual(errors,[speechError('network')]);
});
test('reports silent sessions instead of silently ending',()=>{
 const {instance,errors}=setup();instance.onend();assert.deepEqual(errors,[speechError('no-speech')]);
});
test('rejects insecure pages without starting recognition',()=>{
 const {instance,errors}=setup({isSecureContext:false});assert.equal(instance,undefined);assert.match(errors[0],/HTTPS/);
});
test('offers keyboard dictation when recognition is absent',()=>{
 const {errors}=setup({webkitSpeechRecognition:undefined});assert.match(errors[0],/keyboard/);
});
test('cleanup aborts microphone and removes callbacks',()=>{
 const {instance,stop}=setup();stop();assert.equal(instance.aborted,true);assert.equal(instance.onresult,null);
});
test('distinguishes permission, language and service errors',()=>{
 assert.match(speechError('not-allowed'),/permissions/);
 assert.match(speechError('language-not-supported'),/Marathi or Hindi/);
 assert.match(speechError('service-not-allowed'),/Siri & Dictation/);
 assert.match(speechError('unexpected-code'),/unexpected-code/);
});
