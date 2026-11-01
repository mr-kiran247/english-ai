import test from 'node:test';
import assert from 'node:assert/strict';
import {startAudioRecording} from '../src/audio.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(overrides={}){
 let recorder,stops=0;
 const states=[],errors=[],recordings=[];
 const stream={getTracks:()=>[{stop:()=>stops++}]};
 class MediaRecorder {
  static isTypeSupported(type){return type==='audio/mp4';}
  constructor(input,options){assert.equal(input,stream);assert.equal(options.mimeType,'audio/mp4');this.mimeType='audio/mp4';this.state='inactive';recorder=this;}
  start(){this.state='recording';}
  stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable({data:new Blob([new Uint8Array([1,2,3,4])])});this.onstop();});}
 }
 const browser={isSecureContext:true,navigator:{mediaDevices:{getUserMedia:async()=>stream}},MediaRecorder,btoa,...overrides};
 const control=startAudioRecording({browser,onStatus:s=>states.push(s),onError:e=>errors.push(e),onAudio:async a=>recordings.push(a)});
 return {control,states,errors,recordings,get recorder(){return recorder},get stops(){return stops},stream};
}
test('Safari MP4 recording stops, encodes audio and releases microphone',async()=>{
 const session=setup();await tick();assert.equal(session.states.at(-1),'recording');
 session.control.stop();await tick();
 assert.deepEqual(session.recordings,[{mimeType:'audio/mp4',data:'AQIDBA=='}]);assert.equal(session.states.at(-1),'idle');assert.ok(session.stops>0);assert.deepEqual(session.errors,[]);
});
test('denied microphone permission resets state instead of hanging',async()=>{
 const session=setup({navigator:{mediaDevices:{getUserMedia:async()=>{throw new DOMException('Denied','NotAllowedError')}}}});
 await tick();assert.equal(session.states.at(-1),'idle');assert.match(session.errors[0],/permission was denied/);
});
test('cancelling while permission is pending closes a late microphone stream',async()=>{
 let resolve;const session=setup({navigator:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)}}});
 session.control.cancel();resolve(session.stream);await tick();assert.ok(session.stops>0);assert.equal(session.recorder,undefined);assert.deepEqual(session.recordings,[]);
});
test('cancelled recording does not upload audio',async()=>{
 const session=setup();await tick();session.control.cancel();await tick();assert.deepEqual(session.recordings,[]);assert.ok(session.stops>0);
});
test('insecure pages fail before requesting microphone',async()=>{
 const session=setup({isSecureContext:false});await tick();assert.equal(session.states.at(-1),'idle');assert.match(session.errors[0],/HTTPS/);
});
