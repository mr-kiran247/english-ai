export function startAudioRecording({browser = window, onStatus, onAudio, onError, maxMs = 20000}) {
 let cancelled=false, recorder, stream, timer, failed=false;
 const release=()=>{clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());};
 const stop=()=>{if(recorder?.state==='recording'){onStatus('processing');recorder.stop();}};
 const cancel=()=>{cancelled=true;release();if(recorder?.state==='recording')recorder.stop();};
 onStatus('starting');
 (async()=>{
  try {
   if(!browser.isSecureContext)throw new Error('Microphone recording requires HTTPS.');
   if(!browser.MediaRecorder||!browser.navigator.mediaDevices?.getUserMedia)throw new Error('Audio recording is unavailable in this browser. Type or use your keyboard’s microphone.');
   browser.speechSynthesis?.cancel();
   stream=await browser.navigator.mediaDevices.getUserMedia({audio:true});
   if(cancelled){release();return;}
   const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(type=>browser.MediaRecorder.isTypeSupported?.(type));
   recorder=mime?new browser.MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:64000}):new browser.MediaRecorder(stream);
   const chunks=[];let size=0;
   recorder.ondataavailable=event=>{
    if(!event.data?.size)return;
    size+=event.data.size;
    if(size>1048576){failed=true;stop();release();onStatus('idle');onError('Recording is too large. Please record a shorter sentence.');return;}
    chunks.push(event.data);
   };
   recorder.onerror=()=>{if(cancelled)return;failed=true;release();stop();onStatus('idle');onError('The recording was interrupted. Please try again.');};
   recorder.onstop=async()=>{
    release();if(cancelled||failed)return;
    try {
     const mimeType=(recorder.mimeType||mime||'').split(';')[0];
     const blob=new Blob(chunks,{type:mimeType});
     if(!blob.size)throw new Error('No audio was captured. Please record again.');
     const bytes=new Uint8Array(await blob.arrayBuffer());
     let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
     if(!cancelled)await onAudio({data:browser.btoa(binary),mimeType});
    }catch(error){if(!cancelled)onError(error.message||'Could not process the recording.');}
    finally{if(!cancelled)onStatus('idle');}
   };
   recorder.start(1000);onStatus('recording');timer=setTimeout(stop,maxMs);
  }catch(error){release();if(cancelled)return;onStatus('idle');onError(error.name==='NotAllowedError'?'Microphone permission was denied. Allow microphone access for this website in Safari, then try again.':error.message||'Could not start audio recording.');}
 })();
 return {stop,cancel};
}
