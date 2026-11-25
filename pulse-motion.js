const BASE_INJECTION_MS=5700,BASE_ITEM_ANIMATION_MS=3600,BASE_CONTACT_MS=2980,BASE_POINT_MS=900,BASE_DISPENSER_MS=15200;
export const clamp01=x=>Math.max(0,Math.min(1,x));
export const smooth=x=>{const t=clamp01(x);return t*t*(3-2*t);};
export const mix3=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
// Every hand, needle, plunger, sound and monitor follows the same clock.
function baseInjectionPose(ms){
 const t=Math.max(0,ms-BASE_POINT_MS)/1000;
 return {phase:t<.7?'reach':t<1.35?'lift':t<2.08?'approach':t<3.12?'press':t<3.65?'withdraw':t<4.3?'discard':'settle',
 reach:smooth(t/.7),lift:smooth((t-.7)/.65),approach:smooth((t-1.35)/.73),press:smooth((t-2.08)/1.04),withdraw:smooth((t-3.12)/.53),discard:smooth((t-3.65)/.65),settle:smooth((t-4.3)/.5),holding:t>=.62&&t<4.05,contact:t>=2.08&&t<3.2,
 recoil:Math.max(0,Math.sin(clamp01((t-2.08)/1.35)*Math.PI)),finished:ms>=BASE_INJECTION_MS};
}
function baseDispenserPose(ms,count=6){
 const t=Math.max(0,ms),cycle=7500/Math.max(1,count),index=Math.min(count-1,Math.max(0,Math.floor((t-2600)/cycle))),local=clamp01((t-2600-index*cycle)/cycle);
 return {fill:smooth((t-400)/1900),focus:smooth(t/900)*(1-smooth((t-10300)/1700)),index,local,cycle,
 dosing:t>=2600&&t<10100,shuffle:smooth((t-10100)/400)*(1-smooth((t-11200)/500)),release:smooth((t-11700)/1400),finished:t>=BASE_DISPENSER_MS};
}
export function lampPower(ms){const t=ms%19000;return t>16400&&t<16700?.3:t>=16700&&t<17150?.72:t>=17150&&t<17400?.42:1;}

// Gravity drives the vertical fall. One short, damped bounce follows contact.
export function fallingBody(seconds,startY,endY,gravity=10){
 const impact=Math.sqrt(2*Math.max(0,startY-endY)/gravity),t=Math.max(0,seconds);
 if(t<impact)return {y:startY-gravity*t*t/2,travel:impact?t/impact:1,landed:false};
 const after=t-impact,speed=gravity*impact*.16,bounce=Math.max(0,speed*after-gravity*after*after/2);
 return {y:endY+bounce,travel:1,landed:true};
}

// Lighter keeps the needle over the flame for a readable, private reaction.
export const LIGHTER_REACTION_START=1600/1.5,LIGHTER_REACTION_END=6200/1.5;
const baseItemDuration=kind=>kind==='lighter'?7600:BASE_ITEM_ANIMATION_MS;
function baseItemProgress(kind,ms){if(kind!=='lighter')return clamp01(ms/BASE_ITEM_ANIMATION_MS);return ms<1600?clamp01(ms/1600)*.46:ms<6200?.46+(ms-1600)/4600*.36:.82+clamp01((ms-6200)/1400)*.18;}

export const SPEED=1.5;
export const INJECTION_MS=BASE_INJECTION_MS/SPEED,ITEM_ANIMATION_MS=BASE_ITEM_ANIMATION_MS/SPEED,CONTACT_MS=BASE_CONTACT_MS/SPEED,POINT_MS=BASE_POINT_MS/SPEED,DISPENSER_MS=BASE_DISPENSER_MS/SPEED;
export const injectionPose=ms=>baseInjectionPose(ms*SPEED),dispenserPose=(ms,count)=>baseDispenserPose(ms*SPEED,count),itemDuration=k=>baseItemDuration(k)/SPEED,itemProgress=(k,ms)=>baseItemProgress(k,ms*SPEED);
export const visualMotion={INJECTION_MS:BASE_INJECTION_MS,ITEM_ANIMATION_MS:BASE_ITEM_ANIMATION_MS,CONTACT_MS:BASE_CONTACT_MS,POINT_MS:BASE_POINT_MS,DISPENSER_MS:BASE_DISPENSER_MS,itemDuration:baseItemDuration,itemProgress:baseItemProgress,injectionPose:baseInjectionPose,dispenserPose:baseDispenserPose};
