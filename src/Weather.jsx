import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seededRandom } from './surface-materials.js'

// Fiber preserves uniform targets by copying their wrappers. Bind our live uniform
// objects explicitly so the frame loop updates the values actually read by GLSL.
const bindUniforms=uniforms=>material=>{material.uniforms=uniforms}

// One quad per particle; all movement stays on the GPU.
function particleGeometry(count,seed,makeSeed) {
  const base=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry(),rng=seededRandom(seed)
  g.index=base.index;g.attributes.position=base.attributes.position;g.attributes.uv=base.attributes.uv
  const seeds=new Float32Array(count*4)
  for(let i=0;i<count;i++)seeds.set(makeSeed(rng,i),i*4)
  g.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,4));g.instanceCount=count
  return g
}
const colorOutput=`
gl_FragColor.rgb*=uGain;
#include <tonemapping_fragment>
#include <colorspace_fragment>
`
const noise=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<3;i++){n+=noise(p)*a;p=mat2(.8,-.6,.6,.8)*p*2.03+7.;a*=.5;}return n;}`

export function Rain({state}) {
  const mesh=useRef()
  const geometry=useMemo(()=>particleGeometry(9000,508,r=>[(r()-.5)*22,r()*11,(r()-.5)*22,r()]),[])
  const uniforms=useMemo(()=>({uTime:{value:0},uWet:{value:0},uGain:{value:1}}),[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(()=>{const s=state.current;uniforms.uTime.value=s.time;uniforms.uGain.value=s.gain;uniforms.uWet.value=s.precipitation;mesh.current.visible=s.precipitation>.003})
  return <mesh ref={mesh} name="rainfall" geometry={geometry} frustumCulled={false}>
    <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
      vertexShader={`attribute vec4 aSeed;uniform float uTime;varying vec2 vUv;varying float vLight,vBlur;
        void main(){
          vUv=uv;float speed=6.+aSeed.w*5.;float h=mod(aSeed.y-uTime*speed,11.);
          vec3 center=vec3(aSeed.x+h*.11+sin(uTime*.6+aSeed.z)*.06,h,aSeed.z+h*.025);
          vec3 fall=normalize(vec3(.11,1.,.025));vec3 right=normalize(cross(normalize(cameraPosition-center),fall));
          float distanceToCamera=length(cameraPosition-center);
          vBlur=1.-smoothstep(1.,3.5,distanceToCamera);
          float width=mix(.0035,.007,aSeed.w)+vBlur*.008;
          vec3 world=center+right*position.x*width+fall*position.y*(.1+aSeed.w*.24);
          float roof=.9+ .3*exp(-pow((world.z+.25)*1.2,2.));
          float blocked=step(abs(world.x),1.04)*step(abs(world.z),2.25)*step(world.y,roof);
          float lightPool=exp(-dot(world.xz,world.xz)*.035);
          vLight=(.12+.72*lightPool)*(1.-blocked)*smoothstep(0.,.12,h);
          gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
        }`}
      fragmentShader={`uniform float uGain;
uniform float uWet;varying vec2 vUv;varying float vLight,vBlur;
        void main(){float crossSection=exp(-pow((vUv.x-.5)*mix(5.,3.,vBlur),2.));
          float taper=pow(max(0.,sin(vUv.y*3.14159)),.65);
          gl_FragColor=vec4(.66,.79,.88,crossSection*taper*vLight*uWet*mix(.75,.28,vBlur));
          ${colorOutput}
        }`}/>
  </mesh>
}

export function GroundImpacts({state}) {
  const rings=useRef(),spray=useRef()
  const geometry=useMemo(()=>particleGeometry(500,951,r=>[(r()-.5)*16,(r()-.5)*16,r(),r()]),[])
  const splashGeometry=useMemo(()=>particleGeometry(1800,952,r=>[(r()-.5)*16,(r()-.5)*16,r(),r()]),[])
  const uniforms=useMemo(()=>({uTime:{value:0},uWet:{value:0},uGain:{value:1}}),[])
  useEffect(()=>()=>{geometry.dispose();splashGeometry.dispose()},[geometry,splashGeometry])
  useFrame(()=>{const s=state.current;uniforms.uTime.value=s.time;uniforms.uGain.value=s.gain;uniforms.uWet.value=s.precipitation;rings.current.visible=spray.current.visible=s.precipitation>.003})
  return <>
    <mesh ref={rings} name="rain-impacts" geometry={geometry} frustumCulled={false}>
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`attribute vec4 aSeed;uniform float uTime;varying vec2 vUv;varying float vAge,vClear;
          void main(){vUv=uv;vAge=fract(uTime*(1.2+aSeed.w*.8)+aSeed.z);float scale=.05+vAge*.48;
            vec3 p=vec3(aSeed.x+position.x*scale,.004,aSeed.y+position.y*scale);
            vClear=1.-step(abs(aSeed.x),1.08)*step(abs(aSeed.y),2.3);
            gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`}
        fragmentShader={`uniform float uGain;
uniform float uWet;varying vec2 vUv;varying float vAge,vClear;
          void main(){float r=length(vUv-.5)*2.;float ring=exp(-pow((r-(.2+vAge*.65))/.024,2.));
            float second=exp(-pow((r-(.1+vAge*.4))/.019,2.))*.35;
            gl_FragColor=vec4(.63,.79,.88,(ring+second)*.28*pow(1.-vAge,2.)*uWet*vClear);
            ${colorOutput}
          }`}/>
    </mesh>
    <mesh ref={spray} name="rain-impact-splashes" geometry={splashGeometry} frustumCulled={false}>
      <shaderMaterial transparent depthWrite={false} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`attribute vec4 aSeed;uniform float uTime;varying vec2 vUv;varying float vAlpha;
          void main(){vUv=uv;float age=fract(uTime*(1.7+aSeed.w)+aSeed.z),t=age*.3;
            float angle=aSeed.z*250.;vec3 p=vec3(aSeed.x+cos(angle)*t*.8,.01+(1.5+aSeed.w*.8)*t-4.9*t*t,aSeed.y+sin(angle)*t*.8);
            vAlpha=pow(1.-age,1.7)*step(0.,p.y)*(1.-step(abs(aSeed.x),1.08)*step(abs(aSeed.y),2.3));
            vec4 view=viewMatrix*vec4(p,1.);view.xy+=position.xy*vec2(.008,.014)*(1.+aSeed.w);
            gl_Position=projectionMatrix*view;}`}
        fragmentShader={`uniform float uGain;
uniform float uWet;varying vec2 vUv;varying float vAlpha;void main(){float d=length(vUv-.5)*2.;gl_FragColor=vec4(.76,.88,.95,exp(-d*d*4.)*vAlpha*uWet*.48);${colorOutput}}`}/>
    </mesh>
  </>
}

export function SoapSpray({state,rinse=false}) {
  const mesh=useRef()
  const geometry=useMemo(()=>particleGeometry(4800,1026,r=>[r(),r(),r(),r()]),[])
  const uniforms=useMemo(()=>({uTime:{value:0},uSpray:{value:0},uCoverage:{value:0},uRinsing:{value:rinse?1:0},uGain:{value:1}}),[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(()=>{const s=state.current;uniforms.uTime.value=s.time;uniforms.uGain.value=s.gain;uniforms.uSpray.value=rinse?s.rinseSpray:s.spray;uniforms.uCoverage.value=rinse?s.rinse:s.applied;mesh.current.visible=uniforms.uSpray.value>.003})
  return <group ref={mesh} name={rinse?"offscreen-rinse-spray":"offscreen-soap-spray"}>
    <mesh name={rinse?"rinse-spray-droplets":"soap-spray-droplets"} geometry={geometry} frustumCulled={false}>
    <shaderMaterial transparent depthWrite={false} uniforms={uniforms} onUpdate={bindUniforms(uniforms)} side={THREE.DoubleSide}
      vertexShader={`attribute vec4 aSeed;uniform float uTime,uCoverage,uRinsing;varying vec2 vUv;varying float vAlpha;
        void main(){vUv=uv;float flight=fract(uTime*2.8+aSeed.y);float front=mix(mix(-2.7,2.9,uCoverage),mix(3.2,-3.2,uCoverage),uRinsing);
          vec3 origin=vec3(7.,mix(3.8,5.2,uRinsing),front-1.4),hit=vec3(.55,.95,clamp(front,-2.15,2.15));
          vec3 axis=normalize(hit-origin),right=normalize(cross(axis,vec3(0,1,0))),up=cross(right,axis);
          float angle=aSeed.x*6.283185,radius=sqrt(aSeed.z)*(.035+flight*.52);
          vec3 p=mix(origin,hit,flight)+right*cos(angle)*radius+up*sin(angle)*radius;
          p.y-=flight*flight*.13;
          vec4 view=viewMatrix*vec4(p,1.);
          vec2 along=normalize((viewMatrix*vec4(axis,0.)).xy+vec2(.0001,0.)),across=vec2(-along.y,along.x);
          view.xy+=across*position.x*(.002+aSeed.w*.004)+along*position.y*(.012+aSeed.w*.02);
          gl_Position=projectionMatrix*view;vAlpha=smoothstep(0.,.05,flight)*(1.-smoothstep(.87,1.,flight));}`}
      fragmentShader={`uniform float uGain;
uniform float uSpray;varying vec2 vUv;varying float vAlpha;
        void main(){float d=length((vUv-.5)*2.);gl_FragColor=vec4(.84,.91,.97,exp(-d*d*3.7)*vAlpha*uSpray*.48);${colorOutput}}`}/>
    </mesh>
    {rinse && <mesh name="rinse-impact-aerosol" geometry={geometry} frustumCulled={false}>
      <shaderMaterial transparent depthWrite={false} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`attribute vec4 aSeed;uniform float uTime,uCoverage;varying vec2 vUv;varying float vAlpha;
          void main(){vUv=uv;float age=fract(uTime*3.5+aSeed.x),t=age*.36;
            float front=mix(3.2,-3.2,uCoverage),angle=aSeed.y*6.283185;
            vec3 p=vec3(.7,.92,clamp(front,-2.15,2.15));
            p+=vec3(.7+cos(angle)*1.6,1.2+aSeed.z*2.,sin(angle)*1.6)*t;
            p.y-=4.9*t*t;vec4 view=viewMatrix*vec4(p,1.);
            view.xy+=position.xy*(.006+aSeed.w*.018);gl_Position=projectionMatrix*view;
            vAlpha=pow(1.-age,2.)*smoothstep(0.,.06,age);}`}
        fragmentShader={`uniform float uSpray,uGain;varying vec2 vUv;varying float vAlpha;
          void main(){float d=length(vUv-.5)*2.;gl_FragColor=vec4(.7,.84,.93,exp(-d*d*4.)*vAlpha*uSpray*.4);${colorOutput}}`}/>
    </mesh>}
    <mesh name={rinse?"rinse-spray-fan":"soap-spray-fan"} frustumCulled={false}>
      <planeGeometry args={[1,1]}/>
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`uniform float uCoverage,uRinsing;varying vec2 vUv;
          void main(){vUv=uv;float flight=uv.y;float front=mix(mix(-2.7,2.9,uCoverage),mix(3.2,-3.2,uCoverage),uRinsing);
            vec3 origin=vec3(7.,mix(3.8,5.2,uRinsing),front-1.4),hit=vec3(.55,.95,clamp(front,-2.15,2.15));
            vec3 center=mix(origin,hit,flight);center.y-=flight*flight*.13;
            vec3 axis=normalize(hit-origin),right=normalize(cross(axis,normalize(cameraPosition-center)));
            vec3 p=center+right*(uv.x-.5)*(.035+flight*1.12);
            gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`}
        fragmentShader={`uniform float uGain;
uniform float uTime,uSpray;varying vec2 vUv;${noise}
          void main(){float lateral=abs(vUv.x*2.-1.);
            float edge=pow(max(0.,1.-lateral*lateral),2.);
            float flow=fbm(vec2(vUv.x*14.,vUv.y*38.-uTime*19.));
            float core=exp(-lateral*lateral*30.)*.075;
            float fade=smoothstep(0.,.04,vUv.y)*(1.-smoothstep(.87,1.,vUv.y));
            gl_FragColor=vec4(.86,.93,.98,(edge*flow*.22+core)*fade*uSpray);
            ${colorOutput}
          }`}/>
    </mesh>
  </group>
}

export function Atmosphere({state}) {
  const mist=useRef()
  const mistGeometry=useMemo(()=>particleGeometry(32,779,r=>[(r()-.5)*16,.16+r()*.6,(r()-.5)*16,r()]),[])
  const uniforms=useMemo(()=>({uTime:{value:0},uDensity:{value:0},uGain:{value:1}}),[])
  useEffect(()=>()=>mistGeometry.dispose(),[mistGeometry])
  useFrame(()=>{
    const s=state.current;uniforms.uTime.value=s.time;uniforms.uGain.value=s.gain;uniforms.uDensity.value=s.chapter===0?s.rain:1
    mist.current.visible=uniforms.uDensity.value>.01
  })
  return <>
    <mesh ref={mist} name="layered-rain-mist" geometry={mistGeometry} frustumCulled={false} renderOrder={3}>
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`attribute vec4 aSeed;uniform float uTime;varying vec2 vUv;varying vec3 vWorld;varying float vPhase;
          void main(){vUv=uv;vPhase=aSeed.w*19.;vec3 center=aSeed.xyz;center.x+=sin(uTime*.1+vPhase)*.5;center.z+=cos(uTime*.07+vPhase)*.4;
            vec3 right=normalize(vec3(cameraPosition.z-center.z,0.,center.x-cameraPosition.x));
            vWorld=center+right*position.x*(3.+aSeed.w*3.)+vec3(0,1,0)*position.y*(.7+aSeed.w*.65);
            gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`}
        fragmentShader={`uniform float uGain;
uniform float uTime,uDensity;varying vec2 vUv;varying vec3 vWorld;varying float vPhase;${noise}
          void main(){vec2 p=(vUv-.5)*2.;float edge=pow(max(0.,1.-dot(p,p)),2.);
            vec2 flow=vec2(vUv.x*4.+uTime*.035+vPhase,vUv.y*3.-uTime*.018);
            float cloud=smoothstep(.2,.72,fbm(flow+vec2(fbm(flow+uTime*.012),0.)));
            float floorFade=smoothstep(.015,.18,vWorld.y)*(1.-smoothstep(.7,1.45,vWorld.y));
            float outsideCar=smoothstep(.9,1.35,abs(vWorld.x))+smoothstep(2.1,2.65,abs(vWorld.z));
            float lit=exp(-dot(vWorld.xz,vWorld.xz)*.018);
            float alpha=edge*cloud*floorFade*min(1.,outsideCar)*uDensity*(.055+.075*lit);
            gl_FragColor=vec4(mix(vec3(.24,.34,.42),vec3(.55,.67,.76),lit),alpha);
            ${colorOutput}
          }`}/>
    </mesh>
  </>
}

// Small irregular runoff patches stay close to drip lines, rather than covering
// the studio floor. Rinse spreads and dilutes these remnants deterministically.
export function GroundLather({state}) {
  const mesh=useRef()
  const geometry=useMemo(()=>particleGeometry(70,231,r=>[(r()<.5?-1:1)*(1.05+r()*.5),(r()-.5)*4.7,r(),r()]),[])
  const uniforms=useMemo(()=>({uFoam:{value:0},uRinse:{value:0},uTime:{value:0},uGain:{value:1}}),[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(()=>{const s=state.current;uniforms.uFoam.value=s.applied;uniforms.uRinse.value=s.rinse;uniforms.uTime.value=s.time;uniforms.uGain.value=s.gain;mesh.current.visible=s.applied>.02})
  return <mesh ref={mesh} name="ground-lather" geometry={geometry} frustumCulled={false}>
    <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
      vertexShader={`attribute vec4 aSeed;uniform float uRinse;varying vec2 vUv;varying vec2 vWorld;varying float vSeed;
        void main(){vUv=uv;vSeed=aSeed.w;float size=(.07+aSeed.z*.17)*(1.+uRinse*.6);
          vec3 p=vec3(aSeed.x+position.x*size,.016+aSeed.w*.002,aSeed.y+position.y*size*1.7);
          p.x+=sign(aSeed.x)*uRinse*aSeed.z*.22;vWorld=p.xz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`}
      fragmentShader={`uniform float uFoam,uRinse,uTime,uGain;varying vec2 vUv,vWorld;varying float vSeed;${noise}
        void main(){float edge=1.-smoothstep(.2,.5,length(vUv-.5));
          float holes=smoothstep(.3,.65,fbm(vUv*12.+vSeed*17.));
          float front=mix(-2.7,2.9,uFoam);
          float deposit=(1.-smoothstep(front-.4,front+.4,vWorld.y))*smoothstep(.05,.3,uFoam);
          float pores=mix(.6,1.,noise(vUv*95.));
          gl_FragColor=vec4(vec3(.68,.77,.81)*pores,edge*holes*deposit*(1.-uRinse*.86)*.72);
          ${colorOutput}
        }`}/>
  </mesh>
}
