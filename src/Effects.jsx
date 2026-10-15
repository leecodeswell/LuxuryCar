import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

export default function Effects({ state }) {
  const {gl,scene,camera,size}=useThree()
  const pipeline=useMemo(()=>{
    const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(4,gl.capabilities.maxSamples)})
    const composer=new EffectComposer(gl,target),render=new RenderPass(scene,camera)
    const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.22,.35,1.25)
    const lens=new ShaderPass({
      uniforms:{tDiffuse:{value:null},uBlackout:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform sampler2D tDiffuse;uniform float uBlackout;varying vec2 vUv;
        void main(){
          vec3 color=texture2D(tDiffuse,vUv).rgb;
          float vignette=1.-dot(vUv-.5,vUv-.5)*.3;
          gl_FragColor=vec4(color*vignette*(1.-uBlackout),1.);
        }`,
    })
    composer.addPass(render);composer.addPass(bloom);composer.addPass(lens);composer.addPass(new OutputPass())
    return {composer,bloom,lens}
  },[gl,scene,camera])
  useEffect(()=>{
    pipeline.composer.setPixelRatio(gl.getPixelRatio());pipeline.composer.setSize(size.width,size.height)
  },[pipeline,gl,size])
  useEffect(()=>()=>{
    pipeline.composer.passes.forEach(pass=>pass.dispose?.());pipeline.composer.dispose()
  },[pipeline])
  useFrame((_,dt)=>{
    const s=state.current
    gl.toneMappingExposure=THREE.MathUtils.lerp(.95,.78,s.foam)*s.exposure
    pipeline.bloom.strength=.18;pipeline.bloom.threshold=2.4
    pipeline.lens.uniforms.uBlackout.value=s.blackout
    camera.updateMatrixWorld()
    gl.info.reset()
    pipeline.composer.render(dt)
  },1)
  return null
}
