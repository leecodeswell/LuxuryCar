import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seededRandom } from './surface-materials.js'

const vertex = `
  attribute vec4 aSeed;
  uniform float uTime;
  varying vec2 vUv;
  varying float vLight;
  void main(){
    vUv=uv;
    float h=mod(aSeed.y-uTime*(5.+aSeed.w*5.),10.);
    vec3 center=vec3(aSeed.x+h*.075,h,aSeed.z);
    vec3 right=normalize(vec3(cameraPosition.z-center.z,0.,center.x-cameraPosition.x));
    float length=.055+aSeed.w*.19;
    vec3 world=center+right*position.x*(.002+aSeed.w*.002)+vec3(.075,1.,.018)*position.y*length;
    bool overCar=abs(world.x)<1.05 && abs(world.z)<2.25 && world.y<.95;
    vLight=(.18+.55*exp(-dot(world.xz,world.xz)*.035))*(overCar?0.:1.);
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
  }`
const fragment=`
  uniform float uWet;varying vec2 vUv;varying float vLight;
  void main(){
    float streak=pow(max(0.,1.-abs(vUv.x*2.-1.)),1.4)*sin(vUv.y*3.14159);
    gl_FragColor=vec4(.65,.79,.87,streak*vLight*uWet*.38);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`

export function Rain({ state }) {
  const mesh=useRef()
  const geometry=useMemo(()=>{
    const base=new THREE.PlaneGeometry(1,1), g=new THREE.InstancedBufferGeometry()
    g.index=base.index;g.attributes.position=base.attributes.position;g.attributes.uv=base.attributes.uv
    const rng=seededRandom(508),seeds=new Float32Array(5200*4)
    for(let i=0;i<5200;i++){seeds.set([(rng()-.5)*20,rng()*10,(rng()-.5)*20,rng()],i*4)}
    g.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,4));g.instanceCount=5200
    return g
  },[])
  const uniforms=useMemo(()=>({uTime:{value:0},uWet:{value:0}}),[])
  useFrame(()=>{uniforms.uTime.value=state.current.time;uniforms.uWet.value=state.current.rain;mesh.current.visible=state.current.chapter===0 && state.current.rain>.003})
  return <mesh ref={mesh} name="rainfall" geometry={geometry} frustumCulled={false}>
    <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide}/>
  </mesh>
}

export function GroundImpacts({ state }) {
  const mesh=useRef()
  const geometry=useMemo(()=>{
    const base=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry()
    g.index=base.index;g.attributes.position=base.attributes.position;g.attributes.uv=base.attributes.uv
    const rng=seededRandom(951),seeds=new Float32Array(280*4)
    for(let i=0;i<280;i++)seeds.set([(rng()-.5)*15,(rng()-.5)*15,rng(),rng()],i*4)
    g.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,4));g.instanceCount=280
    return g
  },[])
  const uniforms=useMemo(()=>({uTime:{value:0},uWet:{value:0}}),[])
  useFrame(()=>{uniforms.uTime.value=state.current.time;uniforms.uWet.value=state.current.rain;mesh.current.visible=state.current.chapter===0 && state.current.rain>.003})
  return <mesh ref={mesh} name="rain-impacts" geometry={geometry} frustumCulled={false}>
    <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms}
      vertexShader={`attribute vec4 aSeed;uniform float uTime;varying vec2 vUv;varying float vAge;
        void main(){vUv=uv;vAge=fract(uTime*(.5+aSeed.w*.4)+aSeed.z);float scale=.08+vAge*.48;
        vec3 p=vec3(aSeed.x+position.x*scale,.004,aSeed.y+position.y*scale);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`}
      fragmentShader={`uniform float uWet;varying vec2 vUv;varying float vAge;
        void main(){float r=length(vUv-.5)*2.;float ring=exp(-pow((r-(.25+vAge*.65))/.025,2.));
        float crown=exp(-pow((r-.12)/.05,2.))*(1.-smoothstep(0.,.2,vAge));
        gl_FragColor=vec4(.6,.8,.9,(ring*.18+ crown*.35)*pow(1.-vAge,2.)*uWet);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }
      `}/>
  </mesh>
}

export function Atmosphere({ state }) {
  const particles=useRef(),mist=useRef()
  const geometry=useMemo(()=>{
    const rng=seededRandom(778),p=new Float32Array(220*3),phase=new Float32Array(220)
    for(let i=0;i<220;i++){p.set([(rng()-.5)*18,rng()*6,(rng()-.5)*18],i*3);phase[i]=rng()}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('aPhase',new THREE.BufferAttribute(phase,1));return g
  },[])
  const uniforms=useMemo(()=>({uTime:{value:0},uSun:{value:0},uRain:{value:0},uFoam:{value:0}}),[])
  useFrame(()=>{
    const s=state.current;uniforms.uTime.value=s.time;uniforms.uSun.value=s.chapter===1?1:0;uniforms.uRain.value=s.rain;uniforms.uFoam.value=s.foam
    particles.current.visible=s.chapter===1;mist.current.visible=s.rain>.01 || s.foam>.01
  })
  return <>
    <points ref={particles} name="sunlit-dust" geometry={geometry} frustumCulled={false}>
      <shaderMaterial transparent depthWrite={false} uniforms={uniforms} blending={THREE.AdditiveBlending}
        vertexShader={`attribute float aPhase;uniform float uTime;varying float vAlpha;
          void main(){vec3 p=position;p.x+=sin(uTime*.09+aPhase*30.)*.22;p.y+=sin(uTime*.12+aPhase*50.)*.15;
          vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp((.45+aPhase)*28./-view.z,1.,4.);vAlpha=.1+aPhase*.2;}`}
        fragmentShader={`varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(1.,.79,.42,exp(-r*r*5.)*vAlpha);}`}/>
    </points>
    <mesh ref={mist} name="floor-mist" rotation={[-Math.PI/2,0,0]} position={[0,.12,0]}>
      <planeGeometry args={[16,18]}/>
      <shaderMaterial transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms}
        vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`uniform float uTime,uRain,uFoam;varying vec2 vUv;
          void main(){vec2 p=vUv-.5;float edge=exp(-dot(p,p)*14.);float cloud=sin(p.x*24.+sin(p.y*17.+uTime*.11)*1.4+uTime*.1)*.5+.5;
          gl_FragColor=vec4(.46,.62,.7,edge*cloud*(uRain*.035+uFoam*.025));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }
        `}/>
    </mesh>
  </>
}
