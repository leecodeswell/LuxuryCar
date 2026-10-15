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
  const uniforms=useMemo(()=>({uTime:{value:0},uWet:{value:0}}),[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(()=>{const s=state.current;uniforms.uTime.value=s.time;uniforms.uWet.value=s.rain;mesh.current.visible=s.chapter===0 && s.rain>.003})
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
      fragmentShader={`uniform float uWet;varying vec2 vUv;varying float vLight,vBlur;
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
  const uniforms=useMemo(()=>({uTime:{value:0},uWet:{value:0}}),[])
  useEffect(()=>()=>{geometry.dispose();splashGeometry.dispose()},[geometry,splashGeometry])
  useFrame(()=>{const s=state.current;uniforms.uTime.value=s.time;uniforms.uWet.value=s.rain;rings.current.visible=spray.current.visible=s.chapter===0 && s.rain>.003})
  return <>
    <mesh ref={rings} name="rain-impacts" geometry={geometry} frustumCulled={false}>
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`attribute vec4 aSeed;uniform float uTime;varying vec2 vUv;varying float vAge,vClear;
          void main(){vUv=uv;vAge=fract(uTime*(1.2+aSeed.w*.8)+aSeed.z);float scale=.05+vAge*.48;
            vec3 p=vec3(aSeed.x+position.x*scale,.004,aSeed.y+position.y*scale);
            vClear=1.-step(abs(aSeed.x),1.08)*step(abs(aSeed.y),2.3);
            gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`}
        fragmentShader={`uniform float uWet;varying vec2 vUv;varying float vAge,vClear;
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
        fragmentShader={`uniform float uWet;varying vec2 vUv;varying float vAlpha;void main(){float d=length(vUv-.5)*2.;gl_FragColor=vec4(.76,.88,.95,exp(-d*d*4.)*vAlpha*uWet*.48);${colorOutput}}`}/>
    </mesh>
  </>
}

export function SoapSpray({state}) {
  const mesh=useRef()
  const geometry=useMemo(()=>particleGeometry(4800,1026,r=>[r(),r(),r(),r()]),[])
  const uniforms=useMemo(()=>({uTime:{value:0},uSpray:{value:0},uCoverage:{value:0}}),[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(()=>{const s=state.current;uniforms.uTime.value=s.time;uniforms.uSpray.value=s.spray;uniforms.uCoverage.value=s.foam;mesh.current.visible=s.chapter===1 && s.spray>.003})
  return <group ref={mesh} name="offscreen-soap-spray">
    <mesh name="soap-spray-droplets" geometry={geometry} frustumCulled={false}>
    <shaderMaterial transparent depthWrite={false} uniforms={uniforms} onUpdate={bindUniforms(uniforms)} side={THREE.DoubleSide}
      vertexShader={`attribute vec4 aSeed;uniform float uTime,uCoverage;varying vec2 vUv;varying float vAlpha;
        void main(){vUv=uv;float flight=fract(uTime*2.8+aSeed.y);float front=mix(-2.7,2.9,uCoverage);
          vec3 origin=vec3(7.,3.8,front-1.4),hit=vec3(.55,.95,clamp(front,-2.15,2.15));
          vec3 axis=normalize(hit-origin),right=normalize(cross(axis,vec3(0,1,0))),up=cross(right,axis);
          float angle=aSeed.x*6.283185,radius=sqrt(aSeed.z)*(.035+flight*.52);
          vec3 p=mix(origin,hit,flight)+right*cos(angle)*radius+up*sin(angle)*radius;
          p.y-=flight*flight*.13;
          vec4 view=viewMatrix*vec4(p,1.);
          vec2 along=normalize((viewMatrix*vec4(axis,0.)).xy+vec2(.0001,0.)),across=vec2(-along.y,along.x);
          view.xy+=across*position.x*(.002+aSeed.w*.004)+along*position.y*(.012+aSeed.w*.02);
          gl_Position=projectionMatrix*view;vAlpha=smoothstep(0.,.05,flight)*(1.-smoothstep(.87,1.,flight));}`}
      fragmentShader={`uniform float uSpray;varying vec2 vUv;varying float vAlpha;
        void main(){float d=length((vUv-.5)*2.);gl_FragColor=vec4(.84,.91,.97,exp(-d*d*3.7)*vAlpha*uSpray*.48);${colorOutput}}`}/>
    </mesh>
    <mesh name="soap-spray-fan" frustumCulled={false}>
      <planeGeometry args={[1,1]}/>
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`uniform float uCoverage;varying vec2 vUv;
          void main(){vUv=uv;float flight=uv.y;float front=mix(-2.7,2.9,uCoverage);
            vec3 origin=vec3(7.,3.8,front-1.4),hit=vec3(.55,.95,clamp(front,-2.15,2.15));
            vec3 center=mix(origin,hit,flight);center.y-=flight*flight*.13;
            vec3 axis=normalize(hit-origin),right=normalize(cross(axis,normalize(cameraPosition-center)));
            vec3 p=center+right*(uv.x-.5)*(.035+flight*1.12);
            gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`}
        fragmentShader={`uniform float uTime,uSpray;varying vec2 vUv;${noise}
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
  const particles=useRef(),mist=useRef()
  const geometry=useMemo(()=>{
    const rng=seededRandom(778),p=new Float32Array(220*3),phase=new Float32Array(220)
    for(let i=0;i<220;i++){p.set([(rng()-.5)*18,rng()*6,(rng()-.5)*18],i*3);phase[i]=rng()}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('aPhase',new THREE.BufferAttribute(phase,1));return g
  },[])
  const mistGeometry=useMemo(()=>particleGeometry(32,779,r=>[(r()-.5)*16,.16+r()*.6,(r()-.5)*16,r()]),[])
  const uniforms=useMemo(()=>({uTime:{value:0},uDensity:{value:0}}),[])
  useEffect(()=>()=>{geometry.dispose();mistGeometry.dispose()},[geometry,mistGeometry])
  useFrame(()=>{
    const s=state.current;uniforms.uTime.value=s.time;uniforms.uDensity.value=s.chapter===0?s.rain:s.chapter===1?s.spray*.6:0
    particles.current.visible=s.chapter===2;mist.current.visible=uniforms.uDensity.value>.01
  })
  return <>
    <points ref={particles} name="sunlit-dust" geometry={geometry} frustumCulled={false}>
      <shaderMaterial transparent depthWrite={false} uniforms={uniforms} onUpdate={bindUniforms(uniforms)} blending={THREE.AdditiveBlending}
        vertexShader={`attribute float aPhase;uniform float uTime;varying float vAlpha;
          void main(){vec3 p=position;p.x+=sin(uTime*.09+aPhase*30.)*.22;p.y+=sin(uTime*.12+aPhase*50.)*.15;
          vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp((.45+aPhase)*28./-view.z,1.,4.);vAlpha=.1+aPhase*.2;}`}
        fragmentShader={`varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(1.,.79,.42,exp(-r*r*5.)*vAlpha);}`}/>
    </points>
    <mesh ref={mist} name="layered-rain-mist" geometry={mistGeometry} frustumCulled={false} renderOrder={3}>
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`attribute vec4 aSeed;uniform float uTime;varying vec2 vUv;varying vec3 vWorld;varying float vPhase;
          void main(){vUv=uv;vPhase=aSeed.w*19.;vec3 center=aSeed.xyz;center.x+=sin(uTime*.1+vPhase)*.5;center.z+=cos(uTime*.07+vPhase)*.4;
            vec3 right=normalize(vec3(cameraPosition.z-center.z,0.,center.x-cameraPosition.x));
            vWorld=center+right*position.x*(3.+aSeed.w*3.)+vec3(0,1,0)*position.y*(.7+aSeed.w*.65);
            gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`}
        fragmentShader={`uniform float uTime,uDensity;varying vec2 vUv;varying vec3 vWorld;varying float vPhase;${noise}
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
