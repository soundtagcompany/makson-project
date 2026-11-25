// Small WebGL renderer. All geometry is local, low-poly and generated once.
import { COLORS, random, modeConfig, clamp, TUNNEL_RADIUS } from './game-core.js';
const normalize = v => { const l = Math.hypot(...v) || 1; return v.map(n => n / l); };
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub = (a,b) => a.map((n,i)=>n-b[i]);
const dot = (a,b) => a.reduce((s,n,i)=>s+n*b[i],0);
const rgb = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
function multiply(a,b) { const out=new Float32Array(16); for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k]; return out; }
function camera(eye,target,aspect,boost,roll=0) {
  const z=normalize(sub(eye,target)),x=normalize(cross([Math.sin(roll),Math.cos(roll),0],z)),y=cross(z,x);
  const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  const f=Math.min(1,aspect)/(Math.tan((108+boost*19)*Math.PI/360)), near=.1, far=230;
  const proj=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
  return multiply(proj,view);
}
function triangle(data,a,b,c) {
  const n=normalize(cross(sub(b,a),sub(c,a)));
  for(const p of [a,b,c])data.push(...p,...n);
}
function rockGeometry(seed=31) {
  const data=[],rng=random(seed),rings=[],segments=8,rows=5;
  for(let i=0;i<=rows;i++) { const ring=[]; for(let j=0;j<segments;j++){ const t=i/rows*Math.PI,a=j/segments*Math.PI*2,r=.85+rng()*.26;ring.push([Math.sin(t)*Math.cos(a)*r,Math.cos(t)*r,Math.sin(t)*Math.sin(a)*r]); } rings.push(ring); }
  for(let i=0;i<rows;i++)for(let j=0;j<segments;j++){const k=(j+1)%segments;triangle(data,rings[i][j],rings[i+1][k],rings[i+1][j]);triangle(data,rings[i][j],rings[i][k],rings[i+1][k]);}
  return data;
}
// Shared meshes: each anomaly stays inside its original collision radius.
function anomalyGeometry(){
 const data=[],point=(i,j)=>{const a=i/18*Math.PI*2,b=j/12*Math.PI;const r=.9+.035*Math.sin(a*5.+b*3.);return [Math.sin(b)*Math.cos(a)*r,Math.cos(b)*r,Math.sin(b)*Math.sin(a)*r];};
 for(let i=0;i<18;i++)for(let j=0;j<12;j++){triangle(data,point(i,j),point(i+1,j+1),point(i+1,j));triangle(data,point(i,j),point(i,j+1),point(i+1,j+1));}return data;
}
function anomalyRing(){
 const data=[],point=(i,j)=>{const a=i/32*Math.PI*2,b=j/4*Math.PI*2,r=.9+.045*Math.cos(b);return [r*Math.cos(a),r*Math.sin(a),.045*Math.sin(b)+.09*Math.sin(a*3.)];};
 for(let i=0;i<32;i++)for(let j=0;j<4;j++){triangle(data,point(i,j),point(i+1,j),point(i+1,j+1));triangle(data,point(i,j),point(i+1,j+1),point(i,j+1));}return data;
}
function cubeGeometry() {
  const data=[],v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  for(const [a,b,c,d] of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]]){triangle(data,v[a],v[b],v[c]);triangle(data,v[a],v[c],v[d]);}return data;
}
function shipGeometry() {
  const data=[],nose=[0,.03,-1.6],top=[0,.48,.35],back=[0,-.12,.85],left=[-1.05,-.12,.7],right=[1.05,-.12,.7];
  for(const t of [[nose,left,top],[nose,top,right],[left,back,top],[top,back,right],[nose,back,left],[nose,right,back]])triangle(data,...t);return data;
}
export class SpaceRenderer {
  constructor(canvas,onLost) {
    this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});
    if(!this.gl)throw new Error('Браузер не смог включить WebGL. Попробуй включить аппаратное ускорение или открыть игру в другом браузере.');
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;onLost?.();});
    canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.init();});
    this.cssWidth=canvas.clientWidth;this.cssHeight=canvas.clientHeight;this.resizeObserver=new ResizeObserver(([entry])=>{this.cssWidth=Math.round(entry.contentRect.width);this.cssHeight=Math.round(entry.contentRect.height);});this.resizeObserver.observe(canvas);
    this.init();this.smoothX=0;this.smoothY=0;this.lastHits=0;this.lastCollected=0;this.particles=[];this.quality=.65;this.slowFrames=0;
  }
  init() {
    const gl=this.gl;this.instancing=gl.getExtension('ANGLE_instanced_arrays');this.batches=new Map();
    let vertex=`attribute vec3 aPos; attribute vec3 aNormal; uniform mat4 uVP; uniform vec3 uOffset,uScale; uniform vec2 uRotation,uPixelGrid; varying vec3 normal; varying float fog;uniform mediump float uTime;varying vec3 localPoint;
    void main(){float a=uRotation.x,b=uRotation.y;mat3 ry=mat3(cos(a),0.,-sin(a),0.,1.,0.,sin(a),0.,cos(a));mat3 rz=mat3(cos(b),sin(b),0.,-sin(b),cos(b),0.,0.,0.,1.);localPoint=aPos;vec3 shape=aPos;if(uGlow>1.5)shape*=1.+.045*sin(aPos.y*8.+uTime*1.7+aPos.x*5.);vec3 p=rz*ry*(shape*uScale)+uOffset;normal=rz*ry*aNormal;fog=clamp((-p.z-28.)/170.,0.,.93);gl_Position=uVP*vec4(p,1.);if(gl_Position.w>0.){vec2 xy=gl_Position.xy/gl_Position.w;xy=floor(xy*uPixelGrid+.5)/uPixelGrid;gl_Position.xy=xy*gl_Position.w;}}`;
    let fragment=`precision mediump float;uniform vec3 uColor;uniform mediump float uGlow;varying vec3 normal;varying float fog;uniform mediump float uTime;varying vec3 localPoint;void main(){float light=.45+.55*max(dot(normalize(normal),normalize(vec3(-.5,.8,.6))),0.);vec3 col=mix(uColor*mix(light,1.,uGlow),vec3(.05,.045,.18),fog);if(uGlow>1.5){float wave=localPoint.y*6.+localPoint.x*3.+sin(localPoint.z*8.+uTime*.7)*1.2+uTime*.4;vec3 prism=.5+.5*cos(wave+uColor*5.+vec3(0.,2.1,4.2));float rim=pow(1.-abs(normalize(normal).z),2.);float bands=.55+.45*sin(wave*3.);col=mix(prism*(.3+bands*.5)+rim*uColor*.6,vec3(.025,.02,.07),fog*.7);}float d=mod(gl_FragCoord.x+gl_FragCoord.y,2.)*.033;col=floor((col+d)*18.)/18.;gl_FragColor=vec4(col,1.);}`;
    if(this.instancing){
      vertex=vertex.replace('uniform vec3 uOffset,uScale; uniform vec2 uRotation,uPixelGrid;', 'attribute vec3 uOffset,uScale,uColor; attribute vec2 uRotation; attribute float uGlow; uniform vec2 uPixelGrid; varying mediump vec3 instanceColor; varying mediump float instanceGlow;').replace('void main(){','void main(){instanceColor=uColor;instanceGlow=uGlow;');
      fragment=fragment.replace('uniform vec3 uColor;uniform mediump float uGlow;', 'varying mediump vec3 instanceColor;varying mediump float instanceGlow;').replaceAll('uColor','instanceColor').replaceAll('uGlow','instanceGlow');
    }
    if(!this.instancing)vertex='uniform mediump float uGlow;'+vertex;
    const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Не удалось запустить 3D-рендерер.');gl.deleteShader(vs);gl.deleteShader(fs);this.program=program;gl.useProgram(program);
    this.u={};for(const name of ['VP','Offset','Scale','Rotation','Color','Glow','PixelGrid','Time'])this.u[name]=gl.getUniformLocation(program,'u'+name);
    this.pos=gl.getAttribLocation(program,'aPos');this.normal=gl.getAttribLocation(program,'aNormal');gl.enableVertexAttribArray(this.pos);gl.enableVertexAttribArray(this.normal);
    this.instanceAttrs=this.instancing?['Offset','Scale','Rotation','Color','Glow'].map(name=>gl.getAttribLocation(program,'u'+name)):[];
    this.meshes={anomaly:this.mesh(anomalyGeometry()),ring:this.mesh(anomalyRing()),cube:this.mesh(cubeGeometry()),rock:this.mesh(rockGeometry()),ship:this.mesh(shipGeometry())};
    for(let i=0;i<4;i++)this.meshes['rock'+i]=this.mesh(rockGeometry(31+i*137));
    const stars=[],rng=random(890);
    for(let i=0;i<320;i++){const x=(rng()-.5)*210,y=rng()*95-20,z=-25-rng()*170,s=.025+rng()*.09;triangle(stars,[x-s,y,z],[x+s,y,z],[x,y+s*2,z]);}
    this.meshes.stars=this.mesh(stars);gl.enable(gl.DEPTH_TEST);gl.clearColor(.035,.025,.13,0);this.initPost();
  }
  mesh(data){const gl=this.gl,b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return {b,n:data.length/6};}
  draw(type,offset,scale,color,rotation=[0,0],glow=0){
    if(this.instancing){
      let batch=this.batches.get(type);if(!batch){batch={data:new Float32Array(12*256),count:0,buffer:this.gl.createBuffer(),capacity:0};this.batches.set(type,batch);}
      const at=batch.count*12;if(at+12>batch.data.length){const data=new Float32Array(batch.data.length*2);data.set(batch.data);batch.data=data;}
      batch.data.set(offset,at);batch.data.set(scale,at+3);batch.data.set(rotation,at+6);batch.data.set(color,at+8);batch.data[at+11]=glow;batch.count++;return;
    }
    const gl=this.gl,m=this.meshes[type];gl.bindBuffer(gl.ARRAY_BUFFER,m.b);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(this.normal,3,gl.FLOAT,false,24,12);gl.uniform3fv(this.u.Offset,offset);gl.uniform3fv(this.u.Scale,scale);gl.uniform3fv(this.u.Color,color);gl.uniform2fv(this.u.Rotation,rotation);gl.uniform1f(this.u.Glow,glow);gl.drawArrays(gl.TRIANGLES,0,m.n);}
  flush(){
    if(!this.instancing)return;const gl=this.gl,ext=this.instancing,sizes=[3,3,2,3,1],offsets=[0,12,24,32,44];
    for(const attr of this.instanceAttrs){gl.enableVertexAttribArray(attr);ext.vertexAttribDivisorANGLE(attr,1);}
    for(const [type,batch]of this.batches){if(!batch.count)continue;const mesh=this.meshes[type];
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.b);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(this.normal,3,gl.FLOAT,false,24,12);
      gl.bindBuffer(gl.ARRAY_BUFFER,batch.buffer);if(batch.capacity!==batch.data.byteLength){gl.bufferData(gl.ARRAY_BUFFER,batch.data.byteLength,gl.DYNAMIC_DRAW);batch.capacity=batch.data.byteLength;}
      gl.bufferSubData(gl.ARRAY_BUFFER,0,batch.data.subarray(0,batch.count*12));
      this.instanceAttrs.forEach((attr,i)=>gl.vertexAttribPointer(attr,sizes[i],gl.FLOAT,false,48,offsets[i]));
      ext.drawArraysInstancedANGLE(gl.TRIANGLES,0,mesh.n,batch.count);batch.count=0;
    }
    for(const attr of this.instanceAttrs){ext.vertexAttribDivisorANGLE(attr,0);gl.disableVertexAttribArray(attr);}
  }
  initPost(){
    const gl=this.gl,vs=gl.createShader(gl.VERTEX_SHADER),fs=gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vs,`attribute vec2 aQuad;varying vec2 uv;void main(){uv=aQuad*.5+.5;gl_Position=vec4(aQuad,0.,1.);}`);
    // The supplied optical illusion is animated directly in the existing post pass.
    gl.shaderSource(fs,`precision mediump float;
    varying vec2 uv;uniform sampler2D scene,illusion;uniform float boost,hit,phase,time,aspect,flow,flight,tunnelRadius,fovScale;uniform vec2 tunnelEye;
    vec3 spectrum(float h){return .5+.5*cos(6.283185*(h+vec3(0.,.33,.67)));}
    vec3 tunnelAt(vec2 p){
      // Intersect the camera ray with the same cylindrical volume as the physics.
      vec2 viewRay=p*2./fovScale;float aa=max(dot(viewRay,viewRay),.00001),bb=dot(tunnelEye,viewRay);
      float far=(-bb+sqrt(max(0.,bb*bb+aa*(tunnelRadius*tunnelRadius-dot(tunnelEye,tunnelEye)))))/aa;
      vec2 wall=tunnelEye+viewRay*far;float radius=max(tunnelRadius/(far+tunnelRadius),.008),depth=-log(radius),angle=atan(wall.y,wall.x);
      // Log-polar projection: the reference travels out of the vanishing point,
      // accelerating across the screen instead of oscillating in place.
      float along=log(radius)*.72-flight;
      float twist=angle+depth*.82+flight*.42+sin(depth*3.-time*.7)*.035*flow;
      float first=fract(along),second=fract(along+.5);
      float sourceInner=mix(.07,.17,smoothstep(.06,.35,radius));
      float sourceDepth=log(.47/sourceInner);
      float r1=sourceInner*exp(first*sourceDepth),r2=sourceInner*exp(second*sourceDepth);
      vec2 ray=vec2(cos(twist),sin(twist));
      vec3 a=texture2D(illusion,.5+ray*r1).rgb;
      vec3 b=texture2D(illusion,.5+ray*r2).rgb;
      float blend=sin(first*3.14159265);blend*=blend;
      vec3 color=a*blend+b*(1.-blend);
      // Central void and brighter walls provide a stable depth cue.
      return color*smoothstep(.014,.065,radius)*(.85+.3*smoothstep(.06,.45,radius));
    }
    void main(){
      vec2 center=vec2(.5,.53)+vec2(sin(time*.19),cos(time*.23))*.013*flow;
      vec2 d=(uv-center)*vec2(aspect,1.);float r=length(d),a=atan(d.y,d.x);
      float edge=smoothstep(.07,.65,r),t=time*(.42+boost*.32)*flow;
      vec2 tunnelPoint=d;
      vec3 tunnel=tunnelAt(tunnelPoint);
      // A short radial exposure stretches the actual reference into speed trails.
      // Single sharp tunnel sample.
      vec3 rainbow=spectrum(a*3.18309886-log(max(r,.015))*1.5-flight*.4);
      // Distort the scene itself as well; the flight centre remains readable.
      float angle=(sin(r*12.-t*1.8+a*3.)*.115+sin(t*.65)*.065)*edge*flow;
      mat2 turn=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
      vec2 warped=turn*d*(1.+sin(r*23.-t*2.5+a*4.)*.095*edge*flow);
      vec2 q=clamp(center+warped/vec2(aspect,1.),vec2(.002),vec2(.998));
      vec4 base=texture2D(scene,q);
      vec3 col=mix(tunnel,base.rgb,base.a);
      col+=vec3(.18,.012,.025)*hit*edge;
      gl_FragColor=vec4(col,1.);
    }`);
    for(const shader of [vs,fs]){gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));}
    this.post=gl.createProgram();gl.attachShader(this.post,vs);gl.attachShader(this.post,fs);gl.linkProgram(this.post);if(!gl.getProgramParameter(this.post,gl.LINK_STATUS))throw Error('Не запустились эффекты WebGL');gl.deleteShader(vs);gl.deleteShader(fs);
    this.postPos=gl.getAttribLocation(this.post,'aQuad');this.postU={};for(const name of ['scene','illusion','boost','hit','phase','time','aspect','flow','flight','tunnelRadius','fovScale','tunnelEye'])this.postU[name]=gl.getUniformLocation(this.post,name);
    this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    this.illusionTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.illusionTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([20,15,28,255]));
    for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
    for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
    const texture=this.illusionTexture,image=new Image();image.onload=()=>{if(this.lost||texture!==this.illusionTexture)return;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.activeTexture(gl.TEXTURE0);this.illusionReady=true;};image.src=new URL('./asteroid-illusion.png',import.meta.url).href;
    this.target=gl.createFramebuffer();this.texture=gl.createTexture();this.depth=gl.createRenderbuffer();this.targetW=0;
  }
  sizeTarget(w,h){const gl=this.gl;if(w===this.targetW&&h===this.targetH)return;this.targetW=w;this.targetH=h;gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.bindRenderbuffer(gl.RENDERBUFFER,this.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);gl.bindFramebuffer(gl.FRAMEBUFFER,this.target);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.depth);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Недоступен буфер эффектов');}
  render(r,p,time,motion=true,wild=true,dt=1/60){
    if(this.lost)return;const gl=this.gl,c=this.canvas,cfg=modeConfig(r?.mode,p?.distance);if(motion)this.tunnelFlight=(this.tunnelFlight||0)+Math.min(dt,.05)*(p?Math.max(.3,(p.speed||cfg.speed)/cfg.speed)*.85:.55);
    // Lower pixel resolution on slow devices rather than slowing down input/physics.
    if(r?.state==='racing'&&dt>.04)this.slowFrames++;else this.slowFrames=Math.max(0,this.slowFrames-1);
    if(this.slowFrames>24&&this.quality>.55){this.quality=Math.max(.55,this.quality-.06);this.slowFrames=0;}
    const ratio=Math.min(this.quality,640/Math.max(this.cssWidth,1),Math.sqrt(230400/Math.max(this.cssWidth*this.cssHeight,1))),w=Math.max(1,Math.floor(this.cssWidth*ratio)),h=Math.max(1,Math.floor(this.cssHeight*ratio));
    if(c.width!==w||c.height!==h){c.width=w;c.height=h;}this.sizeTarget(w,h);gl.bindFramebuffer(gl.FRAMEBUFFER,this.target);gl.viewport(0,0,w,h);gl.enable(gl.DEPTH_TEST);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.enableVertexAttribArray(this.pos);gl.enableVertexAttribArray(this.normal);gl.uniform2f(this.u.PixelGrid,w*.5,h*.5);gl.uniform1f(this.u.Time,time);
    const distance=p?.distance??time*160,x=p?(p.x-320)/28:Math.sin(time*.2)*2,y=p?(p.y-240)/28:Math.cos(time*.2);
    const smooth=1-Math.exp(-dt*14);this.smoothX+=(x-this.smoothX)*smooth;this.smoothY+=(y-this.smoothY)*smooth;
    const boost=p?clamp((p.speed-cfg.speed)/(cfg.turbo-cfg.speed),0,1):0,hit=p?clamp((p.invincible-.8)*3,0,1):0;
    const shake=motion&&wild?Math.sin(time*95)*hit*.12:0,roll=motion?clamp((p?.vx||0)/440,-1,1)*-.045:0;
    gl.uniformMatrix4fv(this.u.VP,false,camera([this.smoothX+shake,this.smoothY+1.1,4.8],[this.smoothX*.93,this.smoothY+.55,-40],w/h,motion?boost:0,roll));
    this.draw('stars',[0,0,(distance/45)%18],[1,1,1],[.73,.77,.94],[0,0],1);
    // No rails or repeated gates: the same volumetric field extends past the screen.
    for(const item of r?.track||[]){const z=-(item.z-distance)/28,rr=item.r/28;if(z-rr>14||z+rr< -155||p?.collected.includes(item.id))continue;const xx=(item.x-320)/28,yy=((item.y??240)-240)/28;
      if(item.type==='rock'){const color=[[1,.15,.6],[.25,.5,1],[.3,1,.55],[1,.55,.1],[.65,.2,1],[.1,1,1]][item.id%6],offset=[xx,yy,z],spin=time*.22+item.spin;
        this.draw('anomaly',offset,[rr,rr,rr],color,[spin,spin*.6],2);
        this.draw('ring',offset,[rr,rr,rr],color,[spin*.8+1.,-spin],1);
        if(rr>1.4)this.draw('ring',offset,[rr,rr,rr],[color[2],color[0],color[1]],[spin+2.,spin*.7],1);
      }
      else {const color=item.type==='phase'?[.2,.8,1]:item.type==='reactor'?[1,.18,.85]:item.type==='nitro'?[1,.85,.05]:[.2,1,.5];const rot=[time*1.6,item.type==='phase'?Math.PI/4:0];
        if(item.type==='shield'){this.draw('cube',[xx,yy,z],[.2,.8,.2],color,rot,1);this.draw('cube',[xx,yy,z],[.8,.2,.2],color,rot,1);}
        else {this.draw('cube',[xx,yy,z],[.55,.55,.55],color,rot,.9);this.draw('cube',[xx,yy,z+.63],[.09,.32,.07],[1,1,1],[0,0],1);}
      }
    }
    const finish=r?.finish||cfg.finish,finishZ=-(finish-distance)/28;
    if(finishZ<0&&finishZ> -160){for(const yy of [-8.5,8.5])this.draw('cube',[0,yy,finishZ],[11.5,.3,.3],[.8,1,.5],[0,0],1);for(const xx of [-11.5,11.5])this.draw('cube',[xx,0,finishZ],[.3,8.5,.3],[.8,1,.5],[0,0],1);for(let i=0;i<22;i++)this.draw('cube',[-10.5+i,8.2,finishZ+.4],[.45,.25,.02],i%2?[.1,.1,.2]:[1,1,1],[0,0],1);}
    for(const pilot of r?.players||[{x:320,y:240,distance,color:0}]){if(pilot.dead)continue;const z=-(pilot.distance-distance)/28;if(z>10||z< -150)continue;const xx=(pilot.x-320)/28,yy=((pilot.y??240)-240)/28,bank=-(pilot.vx||0)/440*.4;
      const color=pilot.phase>0?[.3,.85,1]:rgb(COLORS[pilot.color]||COLORS[0]);
      this.draw('ship',[xx,yy,z],[.65,.65,.65],color,[0,bank],pilot.invincible>0?.7:0);
      this.draw('cube',[xx,yy+.2,z-.12],[.13,.1,.23],[.15,.5,.95],[0,bank],.7);
      const flame=.6+(pilot.speed||300)/900+(Math.sin(time*40)+1)*.08;
      this.draw('ship',[xx,yy-.1,z+.55+flame*.22],[.16,.16,-flame*.35],boost>.3?[.4,.9,1]:[1,.6,.1],[0,0],1);
      if(pilot.phase>0)for(let i=0;i<8;i++){const a=i/8*Math.PI*2+time*2;this.draw('cube',[xx+Math.cos(a)*1.1,yy+Math.sin(a)*.85,z],[.09,.09,.09],[.2,.8,1],[time,0],1);}
    }
    if(p){const impact=p.hits>this.lastHits,pickup=(p.pickupCount??p.collected.length)>this.lastCollected;this.lastHits=p.hits;this.lastCollected=(p.pickupCount??p.collected.length);
      if(motion&&(impact||pickup)){const rng=random(Math.floor(time*1000));for(let i=0;i<24;i++)this.particles.push({x,y,z:distance,t:time,vx:(rng()-.5)*12,vy:(rng()-.5)*12,vz:(rng()-.5)*14,color:impact?[1,.48,.13]:[.5,1,.5]});this.particles=this.particles.slice(-60);}
    }
    this.particles=this.particles.filter(q=>time-q.t<1);
    for(const q of this.particles){const age=time-q.t,s=(1-age)*.15;this.draw('cube',[q.x+q.vx*age,q.y+q.vy*age,-(q.z-distance)/28+q.vz*age],[s,s,s],q.color,[age*4,age*3],1);}
    if(motion)for(let i=0;i<28;i++){const a=i*2.4,z=8-((distance/28+i*9)%130);this.draw('cube',[x+Math.cos(a)*(7+i%3),y+Math.sin(a)*(5+i%4),z],[.014,.014,.3+boost*2],[.4,.65,.95],[0,0],1);}
    this.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.DEPTH_TEST);gl.useProgram(this.post);gl.disableVertexAttribArray(this.normal);gl.enableVertexAttribArray(this.postPos);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.vertexAttribPointer(this.postPos,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.postU.scene,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.illusionTexture);gl.uniform1i(this.postU.illusion,1);gl.activeTexture(gl.TEXTURE0);gl.uniform1f(this.postU.boost,wild&&motion?boost:0);gl.uniform1f(this.postU.hit,wild&&motion?hit:0);gl.uniform1f(this.postU.phase,wild&&p?.phase>0?1:0);gl.uniform1f(this.postU.time,time);gl.uniform1f(this.postU.aspect,w/h);gl.uniform1f(this.postU.flow,motion?1:0);gl.uniform1f(this.postU.flight,this.tunnelFlight||0);gl.uniform1f(this.postU.tunnelRadius,TUNNEL_RADIUS/28);gl.uniform1f(this.postU.fovScale,Math.min(1,w/h)/Math.tan((108+(motion?boost:0)*19)*Math.PI/360));gl.uniform2f(this.postU.tunnelEye,this.smoothX,this.smoothY+1.1);gl.drawArrays(gl.TRIANGLES,0,6);
  }
}
