import {useEffect,useMemo,useRef,useState} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import * as THREE from 'three'
import {STAGES} from './site-content.js'

// Rasterize the existing typography, including its CSS skew and responsive
// layout. The visible title lives in the scene, where the car can occlude it.
export default function HeroTitle({state,reducedMotion}) {
  const {camera,size,gl}=useThree(),mesh=useRef(),[texture,setTexture]=useState(null)
  const direction=useMemo(()=>new THREE.Vector3(),[])
  const carCenter=useMemo(()=>new THREE.Vector3(0,.65,0),[])
  useEffect(()=>{
    // Main camera only: the studio reflection and environment cameras keep
    // their default layer, excluding this camera-facing graphic.
    const enabled=camera.layers.isEnabled(1)
    camera.layers.enable(1)
    return ()=>{if(!enabled)camera.layers.disable(1)}
  },[camera])
  useEffect(()=>{
    let cancelled=false,map
    async function draw(){
      await document.fonts.load('400 256px "Archivo Black"','AUREL')
      if(cancelled)return
      const element=document.querySelector('.hero-wordmark')
      if(!element)return
      const style=getComputedStyle(element),ratio=Math.min(2,gl.getPixelRatio()*2)
      const canvas=document.createElement('canvas')
      canvas.width=Math.ceil(size.width*ratio);canvas.height=Math.ceil(size.height*ratio)
      const ctx=canvas.getContext('2d'),matrix=new DOMMatrix(style.transform)
      const [ox,oy]=style.transformOrigin.split(' ').map(parseFloat)
      ctx.scale(ratio,ratio)
      ctx.translate(element.offsetLeft+ox,element.offsetTop+oy)
      ctx.transform(matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f)
      ctx.translate(-ox,-oy)
      ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      ctx.letterSpacing=style.letterSpacing
      ctx.strokeStyle=style.webkitTextStrokeColor
      ctx.lineWidth=parseFloat(style.webkitTextStrokeWidth)
      const metrics=ctx.measureText(element.textContent)
      const ascent=metrics.fontBoundingBoxAscent,descent=metrics.fontBoundingBoxDescent
      const baseline=(element.offsetHeight-ascent-descent)/2+ascent
      ctx.strokeText(element.textContent,0,baseline)
      map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace
      setTexture(map)
    }
    draw()
    return ()=>{cancelled=true;map?.dispose()}
  },[size.width,size.height,gl])
  useFrame((_,delta)=>{
    if(!mesh.current)return
    const target=state.current.progress<STAGES[1].start?1:0,material=mesh.current.material
    material.opacity=reducedMotion?target:THREE.MathUtils.damp(material.opacity,target,5,Math.min(delta,.1))
    mesh.current.visible=material.opacity>.001
    if(!mesh.current.visible)return
    // A screen-aligned plane beyond the whole car retains the composition
    // through the camera move, while sharing the scene's real depth buffer.
    const depth=camera.position.distanceTo(carCenter)+4
    const height=2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))
    camera.getWorldDirection(direction)
    mesh.current.position.copy(camera.position).addScaledVector(direction,depth)
    mesh.current.quaternion.copy(camera.quaternion)
    mesh.current.scale.set(height*camera.aspect,height,1)
  })
  if(!texture)return null
  return <mesh ref={mesh} name="hero-title" frustumCulled={false} onUpdate={m=>m.layers.set(1)}>
    <planeGeometry args={[1,1]}/>
    <meshBasicMaterial map={texture} color="#808080" transparent alphaTest={.001} depthTest depthWrite={false} toneMapped={false} fog={false}/>
  </mesh>
}
