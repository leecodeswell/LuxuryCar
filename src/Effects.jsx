import { useEffect,useMemo,useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

export default function Effects({state,assetsReady,onPrepared,onReady,onPhase,onUnavailable}) {
  const {gl,scene,camera,size}=useThree()
  const dpr=useThree(s=>s.viewport.dpr)
  const warmed=useRef(false),presented=useRef(0),ready=useRef(false)
  const pipeline=useMemo(()=>{
    const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(4,gl.capabilities.maxSamples)})
    const composer=new EffectComposer(gl,target),render=new RenderPass(scene,camera)
    const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.22,.35,1.25)
    const lens=new ShaderPass({
      uniforms:{tDiffuse:{value:null},uBlackout:{value:0},uFlash:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform sampler2D tDiffuse;uniform float uBlackout,uFlash;varying vec2 vUv;
        void main(){
          vec3 color=texture2D(tDiffuse,vUv).rgb;
          float vignette=1.-dot(vUv-.5,vUv-.5)*.3;
          gl_FragColor=vec4(color*vignette*(1.-uBlackout)+vec3(.9,.95,1.)*uFlash*.06,1.);
        }`,
    })
    composer.addPass(render);composer.addPass(bloom);composer.addPass(lens);composer.addPass(new OutputPass())
    return {composer,bloom,lens}
  },[gl,scene,camera])
  useEffect(()=>{
    pipeline.composer.setPixelRatio(dpr);pipeline.composer.setSize(size.width,size.height)
  },[pipeline,dpr,size])
  useEffect(()=>()=>{
    pipeline.composer.passes.forEach(pass=>pass.dispose?.());pipeline.composer.dispose()
  },[pipeline])
  useEffect(()=>{
    if(!assetsReady)return
    let cancelled=false
    onPhase('lighting')
    const frame=requestAnimationFrame(async()=>{
      try {
        // Parallel shader compilation keeps the loading UI responsive on
        // browsers supporting KHR_parallel_shader_compile.
        await gl.compileAsync(scene,camera)
        if(cancelled)return
        warmed.current=true;onPhase('frame');onPrepared()
      } catch(error) {if(!cancelled){console.error('Studio preparation failed:',error);onUnavailable()}}
    })
    return ()=>{cancelled=true;cancelAnimationFrame(frame)}
  },[assetsReady,gl,scene,camera,onPrepared,onPhase,onUnavailable])
  useFrame((_,dt)=>{
    if(!warmed.current)return
    const s=state.current
    gl.toneMappingExposure=THREE.MathUtils.lerp(.95,.78,s.foam)*s.exposure
    pipeline.bloom.strength=.18;pipeline.bloom.threshold=2.4
    pipeline.lens.uniforms.uBlackout.value=s.blackout;pipeline.lens.uniforms.uFlash.value=s.flash
    camera.updateMatrixWorld()
    gl.info.reset()
    pipeline.composer.render(dt)
    if(!ready.current&&++presented.current>=2){
      ready.current=true
      state.current.firstFrame=true
      performance.mark('aurel:first-frame')
      // Reveal only after the car has actually rendered, never on asset mount.
      requestAnimationFrame(onReady)
    }
  },1)
  return null
}
