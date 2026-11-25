// Procedural effects and the menu → intro → looping flight soundtrack.
import { settings } from './app.js';
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
export class FlightAudio {
  constructor(){this.musicMuted=false;this.context=null;this.music=null;this.playing=false;this.tracks=new Map();this.fade=null;this.fadeFrame=0;this.lastHit=0;this.lastPickup=0;this.lastMiss=0;this.lastCountdown=0;document.addEventListener('settingschange',()=>this.apply());}
  init(){if(this.context){this.context.resume().catch(()=>{});return;}const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;const c=this.context=new AudioCtx();this.master=c.createGain();this.master.connect(c.destination);this.engine=c.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=38;this.engineFilter=c.createBiquadFilter();this.engineFilter.type='lowpass';this.engineFilter.frequency.value=150;this.engineGain=c.createGain();this.engineGain.gain.value=0;this.engine.connect(this.engineFilter).connect(this.engineGain).connect(this.master);this.engine.start();
    const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);let value=0;for(let i=0;i<data.length;i++){value=.8*value+.2*(Math.random()*2-1);data[i]=value;}this.noise=buffer;this.wind=c.createBufferSource();this.wind.buffer=buffer;this.wind.loop=true;this.windFilter=c.createBiquadFilter();this.windFilter.type='highpass';this.windFilter.frequency.value=350;this.windGain=c.createGain();this.windGain.gain.value=0;this.wind.connect(this.windFilter).connect(this.windGain).connect(this.master);this.wind.start();this.apply();}
  getTrack(file){
    if(this.tracks.has(file))return this.tracks.get(file);
    const media=new Audio(file),entry={media,weight:0};media.preload='auto';media.loop=file!=='asteroid 1.mp3';media.volume=0;
    media.addEventListener('error',()=>{if(this.track===file){const e=document.getElementById('music-status');if(e)e.textContent='Не найден трек: '+file;}});
    media.addEventListener('playing',()=>{if(this.track===file){const e=document.getElementById('music-status');if(e)e.textContent='♫ '+file;}});
    media.addEventListener('ended',()=>{if(file==='asteroid 1.mp3'&&this.track===file)this.selectMusic('asteroid 2.mp3',true,false);});
    this.tracks.set(file,entry);return entry;
  }
  apply(){
    if(this.master)this.master.gain.setTargetAtTime(settings.sound?clamp(settings.effectsVolume):0,this.context.currentTime,.04);
    for(const [file,t] of this.tracks){t.media.volume=(!this.musicMuted?clamp(settings.musicVolume):0)*t.weight;
      const needed=t.weight>0||file===this.track;
      if(this.musicMuted||!settings.music||!this.playing||!needed)t.media.pause();
      else if(t.media.paused&&!t.media.ended)t.media.play().catch(()=>{});
    }
    if(this.fade&&this.playing&&!this.musicMuted&&settings.music&&!this.fadeFrame){this.fade.last=performance.now();this.fadeFrame=requestAnimationFrame(now=>this.fadeTick(now));}
  }
  fadeTick(now){
    this.fadeFrame=0;const f=this.fade;if(!f||!this.playing||this.musicMuted||!settings.music)return;
    // Wait for the incoming file to be ready; keep the outgoing music audible.
    if(this.music.readyState>=3&&!this.music.paused)f.elapsed+=Math.min(100,now-f.last);
    f.last=now;const progress=Math.min(1,f.elapsed/1200),mix=progress*progress*(3-2*progress);
    for(const [file,t] of this.tracks)t.weight=(f.from.get(file)||0)*(1-mix)+(file===this.track?mix:0);
    if(progress===1)this.fade=null;this.apply();
  }
  selectMusic(file,restart=false,crossfade=true){
    if(this.track===file&&!restart){this.apply();return;}
    if(this.fadeFrame)cancelAnimationFrame(this.fadeFrame);this.fadeFrame=0;
    const incoming=this.getTrack(file),from=new Map([...this.tracks].map(([name,t])=>[name,t.weight]));
    if(restart){incoming.media.pause();incoming.media.currentTime=0;}
    this.track=file;this.music=incoming.media;
    const audible=[...this.tracks.values()].some(t=>t!==incoming&&t.weight>0&&!t.media.paused);
    this.fade=crossfade&&audible?{from,elapsed:0,last:performance.now()}:null;
    if(!this.fade)for(const [name,t] of this.tracks)t.weight=name===file?1:0;
    this.apply();
  }
  begin(){this.init();this.playing=true;this.lastHit=0;this.lastPickup=0;this.lastMiss=0;this.lastCountdown=0;this.getTrack('asteroid 2.mp3');this.selectMusic('asteroid 1.mp3',true);}
  menu(){this.context?.resume().catch(()=>{});this.silenceEffects();this.playing=true;this.selectMusic('asteroid menu.mp3');}
  resume(){this.playing=true;this.context?.resume().catch(()=>{});this.apply();}
  silenceEffects(){if(this.context){this.engineGain.gain.setTargetAtTime(0,this.context.currentTime,.03);this.windGain.gain.setTargetAtTime(0,this.context.currentTime,.03);}}
  pause(){this.playing=false;for(const t of this.tracks.values())t.media.pause();if(this.fadeFrame)cancelAnimationFrame(this.fadeFrame);this.fadeFrame=0;this.silenceEffects();this.context?.suspend().catch(()=>{});}
  tone(freq,end,duration=.13,type='square',volume=.12,delay=0){const c=this.context;if(!c||!settings.sound)return;const t=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain).connect(this.master);osc.start(t);osc.stop(t+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
  burst(duration=.2,volume=.45,pan=0){const c=this.context;if(!c||!settings.sound)return;const noise=c.createBufferSource(),gain=c.createGain(),panner=c.createStereoPanner();noise.buffer=this.noise;gain.gain.setValueAtTime(volume,c.currentTime);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);panner.pan.value=Math.max(-1,Math.min(1,pan));noise.connect(gain).connect(panner).connect(this.master);noise.start();noise.stop(c.currentTime+duration);noise.onended=()=>{noise.disconnect();gain.disconnect();panner.disconnect();};}
  update(r,p,enabled){if(!this.context||!p)return;const c=this.context,go=enabled&&r.state==='racing'&&!p.dead,t=c.currentTime,speed=p.speed/1000;this.engine.frequency.setTargetAtTime(30+speed*65,t,.07);this.engineFilter.frequency.setTargetAtTime(120+speed*500,t,.06);this.engineGain.gain.setTargetAtTime(go?.04+speed*.055:0,t,.06);this.windGain.gain.setTargetAtTime(go?Math.max(0,speed-.25)*.4:0,t,.07);
    if(enabled&&r.state==='countdown'){const n=Math.ceil(r.countdown);if(n!==this.lastCountdown){this.lastCountdown=n;this.tone(n===1?880:440,n===1?1100:440,.14,'square',.14);}}
    if(p.hits>this.lastHit){this.lastHit=p.hits;if(enabled){this.burst(.35,.9);this.tone(110,28,.32,'sawtooth',.25);}}
    if((p.pickupCount??p.collected.length)>this.lastPickup){this.lastPickup=(p.pickupCount??p.collected.length);if(enabled){this.tone(440,880,.1,'triangle',.25);this.tone(660,1320,.16,'triangle',.22,.09);}}
    if(p.nearMisses>this.lastMiss){this.lastMiss=p.nearMisses;if(enabled){this.burst(.18,.55,(p.x-320)/320);this.tone(180,700,.16,'sine',.1);}}
  }
  finish(won){this.menu();if(won){[440,550,660,880].forEach((f,i)=>this.tone(f,f*1.01,.25,'triangle',.25,i*.12));}else{this.tone(220,55,.6,'sawtooth',.18);}}
}
