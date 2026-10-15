import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { SUN_POSITION } from './Environments.jsx'

export default function Effects({ state }) {
  const {gl,scene,camera,size}=useThree()
  const pipeline=useMemo(()=>{
    const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(4,gl.capabilities.maxSamples)})
    const composer=new EffectComposer(gl,target),render=new RenderPass(scene,camera)
    const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.22,.35,1.25)
    const lens=new ShaderPass({
      uniforms:{tDiffuse:{value:null},uTime:{value:0},uSun:{value:0},uCut:{value:0},uSunUV:{value:new THREE.Vector2(-10,-10)},uAspect:{value:1}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uSun,uCut,uAspect;uniform vec2 uSunUV;varying vec2 vUv;
        void main(){
          vec2 uv=vUv;
          float ground=1.-smoothstep(.1,.38,uv.y);
          uv.x+=sin(uv.y*210.+uTime*1.7)*sin(uv.y*67.-uTime*.8)*.00028*ground*uSun;
          vec3 color=texture2D(tDiffuse,uv).rgb;
          vec2 toSun=uv-uSunUV;toSun.x*=uAspect;
          float visible=step(0.,uSunUV.x)*step(uSunUV.x,1.)*step(0.,uSunUV.y)*step(uSunUV.y,1.);
          vec3 source=texture2D(tDiffuse,clamp(uSunUV,.001,.999)).rgb;
          float luminance=dot(source,vec3(.2126,.7152,.0722));
          float glare=smoothstep(2.5,7.,luminance)*visible*uSun;
          float halo=exp(-length(toSun)*10.)*.35;
          float streak=exp(-abs(toSun.y)*180.)*exp(-abs(toSun.x)*1.7)*.08;
          vec2 ghost=uv-(.5-(uSunUV-.5)*.7);ghost.x*=uAspect;
          float ring=exp(-pow((length(ghost)-.11)/.01,2.))*.018;
          color+=vec3(1.,.64,.27)*glare*(halo+streak)+vec3(.3,.65,1.)*ring*glare;
          float vignette=1.-dot(vUv-.5,vUv-.5)*.14;
          gl_FragColor=vec4(color*vignette*(1.-uCut),1.);
        }`,
    })
    composer.addPass(render);composer.addPass(bloom);composer.addPass(lens);composer.addPass(new OutputPass())
    return {composer,bloom,lens,sun:new THREE.Vector3(...SUN_POSITION),projected:new THREE.Vector3()}
  },[gl,scene,camera])
  useEffect(()=>{
    pipeline.composer.setPixelRatio(gl.getPixelRatio());pipeline.composer.setSize(size.width,size.height)
    pipeline.lens.uniforms.uAspect.value=size.width/size.height
  },[pipeline,gl,size])
  useEffect(()=>()=>{
    pipeline.composer.passes.forEach(pass=>pass.dispose?.());pipeline.composer.dispose()
  },[pipeline])
  useFrame((_,dt)=>{
    const s=state.current
    gl.toneMappingExposure=s.chapter===1?.82:s.chapter===2?.74:.95
    pipeline.bloom.strength=s.chapter===1?.16:.18;pipeline.bloom.threshold=s.chapter===1?2:2.4
    pipeline.lens.uniforms.uTime.value=s.time;pipeline.lens.uniforms.uSun.value=s.chapter===1?1:0;pipeline.lens.uniforms.uCut.value=s.cut
    camera.updateMatrixWorld()
    pipeline.projected.copy(pipeline.sun).normalize().multiplyScalar(100).add(camera.position).project(camera)
    pipeline.lens.uniforms.uSunUV.value.set(pipeline.projected.x*.5+.5,pipeline.projected.y*.5+.5)
    if(pipeline.projected.z>1)pipeline.lens.uniforms.uSunUV.value.set(-10,-10)
    gl.info.reset()
    pipeline.composer.render(dt)
  },1)
  return null
}
