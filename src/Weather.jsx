import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {floorWashGLSL} from './spray-contact.js'
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

export function SoapSpray({state,rinse=false,floorSide=0}) {
  const mesh=useRef()
  const geometry=useMemo(()=>particleGeometry(floorSide?2200:9000,1026,r=>[r(),r(),r(),r()]),[])
  const uniforms=useMemo(()=>({uTime:{value:0},uSpray:{value:0},uCoverage:{value:0},uOrigin:{value:new THREE.Vector3()},uHit:{value:new THREE.Vector3()},uNormal:{value:new THREE.Vector3(0,1,0)},uGround:{value:floorSide?1:0},uWidth:{value:3},uGain:{value:1}}),[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(()=>{
    const s=state.current,fade=THREE.MathUtils.smoothstep(s.local,.56,.62)
    let intensity=rinse?s.rinseSpray:s.spray
    if(rinse)intensity*=floorSide?fade:1-fade
    uniforms.uTime.value=s.time;uniforms.uGain.value=s.gain
    uniforms.uWidth.value=s.spraySweep?.width??3
    uniforms.uSpray.value=intensity;uniforms.uCoverage.value=rinse?s.rinse:s.applied
    mesh.current.visible=intensity>.003
    if(!mesh.current.visible)return
    if(floorSide){
      const z=THREE.MathUtils.lerp(-3.8,3.8,s.floorRinse)
      uniforms.uHit.value.set(floorSide*1.65,.02,z)
      uniforms.uOrigin.value.set(floorSide*7,3.8,z-.8)
      uniforms.uNormal.value.set(0,1,0)
    }else if(s.sprayPose?.valid){
      uniforms.uOrigin.value.copy(s.sprayPose.origin)
      uniforms.uHit.value.copy(s.sprayPose.point).addScaledVector(s.sprayPose.normal,.018*(1-s.rinse))
      uniforms.uNormal.value.copy(s.sprayPose.normal)
    }else mesh.current.visible=false
  })
  return <group ref={mesh} name={floorSide?`floor-rinse-${floorSide}`:rinse?"offscreen-rinse-spray":"offscreen-soap-spray"}>
    <mesh name={rinse?"rinse-spray-droplets":"soap-spray-droplets"} geometry={geometry} frustumCulled={false}>
    <shaderMaterial transparent depthWrite={false} uniforms={uniforms} onUpdate={bindUniforms(uniforms)} side={THREE.DoubleSide}
      vertexShader={`attribute vec4 aSeed;uniform float uTime,uCoverage,uGround,uWidth;uniform vec3 uOrigin,uHit,uNormal;varying vec2 vUv;varying float vAlpha;
        void main(){vUv=uv;float flight=fract(uTime*2.8+aSeed.y);
          vec3 origin=uOrigin,hit=uHit;
          vec3 axis=normalize(hit-origin),right=normalize(cross(axis,vec3(0,1,0))),up=cross(right,axis);
          float angle=aSeed.x*6.283185,radius=sqrt(aSeed.z);
          vec3 bodyFootprint=vec3(cos(angle)*uWidth*.5,sin(angle)*.55,(aSeed.w-.5)*1.6)*radius;
          vec3 groundFootprint=(right*cos(angle)+up*sin(angle))*radius*1.5;
          vec3 footprint=mix(bodyFootprint,groundFootprint,uGround);
          vec3 p=mix(origin,hit,flight)+footprint*pow(flight,.8);
          p.y-=flight*(1.-flight)*.13;
          vec4 view=viewMatrix*vec4(p,1.);
          vec2 along=normalize((viewMatrix*vec4(axis,0.)).xy+vec2(.0001,0.)),across=vec2(-along.y,along.x);
          view.xy+=across*position.x*(.002+aSeed.w*.004)+along*position.y*(.012+aSeed.w*.02);
          gl_Position=projectionMatrix*view;vAlpha=smoothstep(0.,.05,flight)*(1.-smoothstep(.97,1.,flight));}`}
      fragmentShader={`uniform float uGain;
uniform float uSpray;varying vec2 vUv;varying float vAlpha;
        void main(){float d=length((vUv-.5)*2.);gl_FragColor=vec4(.84,.91,.97,exp(-d*d*3.7)*vAlpha*uSpray*.48);${colorOutput}}`}/>
    </mesh>
    {rinse && <mesh name="rinse-impact-aerosol" geometry={geometry} frustumCulled={false}>
      <shaderMaterial transparent depthWrite={false} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`attribute vec4 aSeed;uniform float uTime,uCoverage,uGround,uWidth;uniform vec3 uHit,uNormal;varying vec2 vUv;varying float vAlpha;
          void main(){vUv=uv;float age=fract(uTime*5.5+aSeed.x),t=age*.16;
            float angle=aSeed.y*6.283185;
            vec3 n=normalize(uNormal),tangent=normalize(cross(n,abs(n.y)>.9?vec3(1,0,0):vec3(0,1,0))),bitangent=cross(n,tangent);
            vec3 velocity=n*(.6+aSeed.z*1.2)+(tangent*cos(angle)+bitangent*sin(angle))*(.4+aSeed.w*1.1);
            vec3 spread=vec3((aSeed.z-.5)*uWidth*.94,(aSeed.w-.5)*.5,(aSeed.y-.5)*1.4)*(1.-uGround);
            vec3 p=uHit+spread+n*.012+velocity*t;
            p.y-=4.9*t*t;vec4 view=viewMatrix*vec4(p,1.);
            view.xy+=position.xy*(.006+aSeed.w*.018);gl_Position=projectionMatrix*view;
            vAlpha=pow(1.-age,2.)*smoothstep(0.,.06,age);}`}
        fragmentShader={`uniform float uSpray,uGain;varying vec2 vUv;varying float vAlpha;
          void main(){float d=length(vUv-.5)*2.;gl_FragColor=vec4(.7,.84,.93,exp(-d*d*4.)*vAlpha*uSpray*.4);${colorOutput}}`}/>
    </mesh>}
    <mesh name={rinse?"rinse-spray-fan":"soap-spray-fan"} frustumCulled={false}>
      <planeGeometry args={[1,1,1,24]}/>
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`uniform float uCoverage,uGround,uWidth;uniform vec3 uOrigin,uHit;varying vec2 vUv;
          void main(){vUv=uv;float flight=uv.y;
            vec3 origin=uOrigin,hit=uHit;
            vec3 center=mix(origin,hit,flight);center.y-=flight*(1.-flight)*.13;
            vec3 axis=normalize(hit-origin),right=normalize(cross(axis,normalize(cameraPosition-center)));
            right=mix(right,vec3(1,0,0),uGround);
            vec3 p=center+right*(uv.x-.5)*(.02+sin(flight*3.14159)*.32+flight*mix(uWidth,4.4,uGround));
            gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`}
        fragmentShader={`uniform float uGain;
uniform float uTime,uSpray;varying vec2 vUv;${noise}
          void main(){float lateral=abs(vUv.x*2.-1.);
            float edge=pow(max(0.,1.-lateral*lateral),2.);
            float flow=fbm(vec2(vUv.x*14.,vUv.y*38.-uTime*19.));
            float core=exp(-lateral*lateral*30.)*.075;
            float fade=smoothstep(0.,.04,vUv.y)*(1.-smoothstep(.98,1.,vUv.y));
            gl_FragColor=vec4(.86,.93,.98,(edge*flow*.38+core)*fade*uSpray);
            ${colorOutput}
          }`}/>
    </mesh>
  </group>
}

export function Atmosphere({state}) {
  const mist=useRef()
  const mistGeometry=useMemo(()=>particleGeometry(48,779,r=>[(r()-.5)*16,.22+r()*1.0,(r()-.5)*16,r()]),[])
  const uniforms=useMemo(()=>({uTime:{value:0},uDensity:{value:0},uGain:{value:1}}),[])
  useEffect(()=>()=>mistGeometry.dispose(),[mistGeometry])
  useFrame(()=>{
    const s=state.current;uniforms.uTime.value=s.time;uniforms.uGain.value=s.gain;uniforms.uDensity.value=s.mist
    mist.current.visible=uniforms.uDensity.value>.01
  })
  return <>
    <mesh ref={mist} name="layered-rain-mist" geometry={mistGeometry} frustumCulled={false} renderOrder={3}>
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`attribute vec4 aSeed;uniform float uTime;varying vec2 vUv;varying vec3 vWorld;varying float vPhase;
          void main(){vUv=uv;vPhase=aSeed.w*19.;vec3 center=aSeed.xyz;center.x+=sin(uTime*.1+vPhase)*.5;center.z+=cos(uTime*.07+vPhase)*.4;
            vec3 right=normalize(vec3(cameraPosition.z-center.z,0.,center.x-cameraPosition.x));
            vWorld=center+right*position.x*(3.5+aSeed.w*3.5)+vec3(0,1,0)*position.y*(1.+aSeed.w*.8);
            gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`}
        fragmentShader={`uniform float uGain;
uniform float uTime,uDensity;varying vec2 vUv;varying vec3 vWorld;varying float vPhase;${noise}
          void main(){vec2 p=(vUv-.5)*2.;float edge=pow(max(0.,1.-dot(p,p)),2.);
            vec2 flow=vec2(vUv.x*4.+uTime*.035+vPhase,vUv.y*3.-uTime*.018);
            float cloud=smoothstep(.2,.72,fbm(flow+vec2(fbm(flow+uTime*.012),0.)));
            float floorFade=smoothstep(.015,.18,vWorld.y)*(1.-smoothstep(1.1,2.1,vWorld.y));
            float outsideCar=smoothstep(.9,1.35,abs(vWorld.x))+smoothstep(2.1,2.65,abs(vWorld.z));
            float lit=exp(-dot(vWorld.xz,vWorld.xz)*.018);
            float alpha=edge*cloud*floorFade*min(1.,outsideCar)*uDensity*(.065+.095*lit);
            gl_FragColor=vec4(mix(vec3(.24,.34,.42),vec3(.55,.67,.76),lit),alpha);
            ${colorOutput}
          }`}/>
    </mesh>
  </>
}

// Broad connected pools use the original five runoff regions, with denser
// geometric froth. The two floor jets erase the same spatial wash front.
export function GroundLather({state}) {
  const mesh=useRef()
  const patches=useMemo(()=>[[1.3,-1.3,.7,1.1],[1.45,.8,.75,1.5],[-1.3,-.9,.72,1.5],[-1.35,1.65,.7,1.1],[.25,2.45,1.55,.65]],[])
  const geometry=useMemo(()=>particleGeometry(patches.length,231,(_,i)=>patches[i]),[patches])
  const uniforms=useMemo(()=>({uFoam:{value:0},uFloorRinse:{value:0},uGain:{value:1}}),[])
  const froth=useMemo(()=>{
    const material=new THREE.MeshPhysicalMaterial({color:'#e1ebef',roughness:.76,transparent:true,alphaTest:.02,depthWrite:false})
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms)
      shader.vertexShader='varying vec3 vFoamWorld;\n'+shader.vertexShader
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vFoamWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;`)
      shader.fragmentShader=floorWashGLSL+'varying vec3 vFoamWorld;\n'+shader.fragmentShader
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        diffuseColor.a*=floorSoapAt(vFoamWorld);`)
    }
    const bubbles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material,1800),rng=seededRandom(749),dummy=new THREE.Object3D()
    bubbles.name='floor-foam-froth';bubbles.frustumCulled=false
    for(let i=0;i<1800;i++){
      const [x,z,sx,sz]=patches[i%patches.length],angle=rng()*Math.PI*2,d=Math.sqrt(rng())*.95,r=.008+rng()*.025
      dummy.position.set(x+Math.cos(angle)*d*sx,.022,z+Math.sin(angle)*d*sz)
      dummy.scale.set(r,r*.55,r);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix)
    }
    return bubbles
  },[patches,uniforms])
  useEffect(()=>()=>{geometry.dispose();froth.geometry.dispose();froth.material.dispose()},[geometry,froth])
  useFrame(()=>{const s=state.current;uniforms.uFoam.value=s.applied;uniforms.uFloorRinse.value=s.floorRinse;uniforms.uGain.value=s.gain;mesh.current.visible=froth.visible=s.applied>.02 && s.floorRinse<1})
  return <>
    <mesh ref={mesh} name="ground-lather" geometry={geometry} frustumCulled={false}>
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms} onUpdate={bindUniforms(uniforms)}
        vertexShader={`attribute vec4 aSeed;varying vec2 vUv;varying vec3 vWorld;
          void main(){vUv=uv;vWorld=vec3(aSeed.x+position.x*aSeed.z*2.,.018,aSeed.y+position.y*aSeed.w*2.);
            gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`}
        fragmentShader={`uniform float uGain;varying vec2 vUv;varying vec3 vWorld;${noise}${floorWashGLSL}
          void main(){float contour=length((vUv-.5)*2.)+(fbm(vWorld.xz*9.)-.5)*.23;
            float edge=1.-smoothstep(.83,1.,contour);
            float pores=mix(.68,1.,noise(vWorld.xz*240.));
            gl_FragColor=vec4(vec3(.78,.85,.89)*pores,edge*floorSoapAt(vWorld)*.94);
            ${colorOutput}
          }`}/>
    </mesh>
    <primitive object={froth}/>
  </>
}
