import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {createSprayContact} from './spray-contact.js'
import {createWaterRunners,updateWaterRunners} from './water-runners.js'
import { applySurface,seededRandom,latherGLSL } from './surface-materials.js'

export default function Car({ state,onReady }) {
  const gltf=useGLTF('/models/ferrari.glb','/draco/')
  const shadow=useTexture('/models/ferrari_ao.png')
  const items=useMemo(()=>{
    const rng=seededRandom(458), model=gltf.scene.clone(true)
    model.updateMatrixWorld(true)
    const uniforms={uWet:{value:0},uFoam:{value:0},uRinse:{value:0},uWashZ:{value:4},uSurfaceTime:{value:0}}
    const paint=applySurface(new THREE.MeshPhysicalMaterial({color:'#3b4548',metalness:.68,roughness:.28,clearcoat:1,clearcoatRoughness:.09,envMapIntensity:.8}),uniforms)
    const glass=applySurface(new THREE.MeshPhysicalMaterial({color:'#adbcc3',metalness:0,roughness:.03,transmission:.8,thickness:.008,ior:1.46,clearcoat:1,transparent:true,opacity:1,envMapIntensity:.5}),uniforms)
    const wheels=applySurface(new THREE.MeshPhysicalMaterial({color:'#1d242b',metalness:.92,roughness:.35,clearcoat:.2,envMapIntensity:.45}),uniforms)
    model.traverse(mesh=>{
      if(!mesh.isMesh)return
      mesh.castShadow=true;mesh.receiveShadow=true
      if(mesh.name==='body')mesh.material=paint
      else if(mesh.name==='glass')mesh.material=glass
      else if(/^rim_|^wheel(?:_\d+)?$/.test(mesh.name))mesh.material=wheels
      else {
        mesh.material=mesh.material.clone()
        const name=mesh.material.name
        if(/metal_gray|metal_chrome/i.test(name)){mesh.material.color.set('#70797f');mesh.material.metalness=.94;mesh.material.roughness=.4}
        if(/carbon/i.test(name)){mesh.material.color.set('#0d141a');mesh.material.roughness=.4;mesh.material.metalness=.3}
        if(/tire/i.test(name)){
          mesh.material.color.set('#111419');mesh.material.roughness=.88;mesh.material.metalness=0
        }
        if(/leather|interior|carpet/i.test(name)){mesh.material.color.set('#11171c');mesh.material.roughness=.85;mesh.material.metalness=0}
        applySurface(mesh.material,uniforms,{foam:!(/leather|interior|carpet|glass|light/i.test(name))})
      }
    })
    const body=model.getObjectByName('body'), sampler=new MeshSurfaceSampler(body).setRandomGenerator(rng).build()
    const point=new THREE.Vector3(),normal=new THREE.Vector3(),nm=new THREE.Matrix3().getNormalMatrix(body.matrixWorld)
    const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0)
    const sample=()=>{
      for(let retry=0;retry<60;retry++){
        sampler.sample(point,normal);point.applyMatrix4(body.matrixWorld);normal.applyNormalMatrix(nm)
        if(normal.y>-.1)break
      }
    }
    const dropMaterial=new THREE.MeshPhysicalMaterial({color:'#f6fcff',roughness:.035,transmission:.94,thickness:.0025,ior:1.333,envMapIntensity:.85,transparent:true,opacity:0,depthWrite:false})
    const waterGeometry=new THREE.SphereGeometry(1,6,4),deposits=new Float32Array(12000)
    for(let i=0;i<deposits.length;i++)deposits[i]=rng()*.8
    waterGeometry.setAttribute('aDeposit',new THREE.InstancedBufferAttribute(deposits,1))
    dropMaterial.onBeforeCompile=shader=>{
      shader.uniforms.uWet=uniforms.uWet
      shader.vertexShader='attribute float aDeposit;uniform float uWet;\n'+shader.vertexShader
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed*=smoothstep(aDeposit,aDeposit+.18,uWet);')
    }
    const drops=new THREE.InstancedMesh(waterGeometry,dropMaterial,12000);drops.name='surface-water';drops.frustumCulled=false;drops.visible=false
    for(let i=0;i<12000;i++){
      sample();const r=.0014+Math.pow(rng(),2)*.0048
      dummy.position.copy(point).addScaledVector(normal,r*.26);dummy.quaternion.setFromUnitVectors(up,normal);dummy.scale.set(r,r*.5,r);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix)
    }
    drops.instanceMatrix.needsUpdate=true
    const runners=createWaterRunners(body,()=>{sample();return {point:point.clone(),normal:normal.clone()}},rng,dropMaterial.clone())
    const foamMaterial=new THREE.MeshPhysicalMaterial({color:'#e7edf1',metalness:0,roughness:.8,clearcoat:0,envMapIntensity:.45,transparent:true,opacity:0,alphaTest:.015})
    const foamGeometry=()=>{
      const geometry=new THREE.IcosahedronGeometry(1,0)
      // Radial normals keep tiny bubbles round without adding more triangles.
      geometry.attributes.normal.array.set(geometry.attributes.position.array)
      geometry.normalizeNormals()
      return geometry
    }
    const froth=new THREE.InstancedMesh(foamGeometry(),foamMaterial,18000);froth.name='foam-microbubbles';froth.frustumCulled=false;froth.visible=false
    const trails=[]
    for(let i=0;i<18000;i++){
      sample();const r=.004+Math.pow(rng(),2)*.012
      dummy.position.copy(point).addScaledVector(normal,.018+r*.35);dummy.quaternion.setFromUnitVectors(up,normal);dummy.scale.set(r,r*.85,r);dummy.updateMatrix();froth.setMatrixAt(i,dummy.matrix)
      if(trails.length<38 && normal.y<.3 && point.y>.4 && Math.abs(point.x)>.65 && rng()<.12){
        const start=point.clone().addScaledVector(normal,.008),end=start.clone().add(new THREE.Vector3(0,-.06-rng()*.15,0))
        const mid=start.clone().lerp(end,.5).addScaledVector(normal,.003)
        trails.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(start,mid,end),5,.002+rng()*.002,6,false))
      }
    }
    const trailGeometry=trails.length?mergeGeometries(trails):new THREE.BufferGeometry()
    trails.forEach(g=>g.dispose())
    const drips=new THREE.Mesh(trailGeometry,foamMaterial);drips.name='soap-runoff';drips.visible=false
    foamMaterial.onBeforeCompile=shader=>{
      shader.uniforms.uFoam=uniforms.uFoam;shader.uniforms.uRinse=uniforms.uRinse;shader.uniforms.uWashZ=uniforms.uWashZ
      shader.vertexShader='varying vec3 vLatherWorld;\n'+shader.vertexShader
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 latherPosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          latherPosition=instanceMatrix*latherPosition;
        #endif
        vLatherWorld=(modelMatrix*latherPosition).xyz;`)
      shader.fragmentShader=latherGLSL+'varying vec3 vLatherWorld;\n'+shader.fragmentShader
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float coverage=latherMask(vLatherWorld);
        diffuseColor.a*=smoothstep(.18,.65,coverage);`)
    }
    return {sprayPose:{origin:new THREE.Vector3(),point:new THREE.Vector3(),normal:new THREE.Vector3()},sprayContact:createSprayContact(body),model,paint,glass,uniforms,drops,dropMaterial,foamMaterial,froth,drips,runners}

  },[gltf])
  useEffect(()=>{state.current.sprayContact=items.sprayContact;onReady()},[onReady,state,items])
  useEffect(()=>()=>{
    const materials=new Set()
    items.model.traverse(obj=>{if(obj.isMesh)materials.add(obj.material)})
    materials.forEach(m=>m.dispose())
    for(const mesh of [items.drops,items.froth,items.drips,items.runners.mesh])mesh.geometry.dispose()
    items.runners.mesh.material.dispose()
    items.dropMaterial.dispose();items.foamMaterial.dispose()
  },[items])
  useFrame(()=>{
    const s=state.current,pose=items.sprayPose,contact=items.sprayContact
    if(s.chapter>0){
      pose.valid=contact.trace(s.chapter===2?s.rinse:s.applied,s.chapter===2,pose.origin,pose.point,pose.normal)
      s.sprayPose=pose
    }
    items.uniforms.uWashZ.value=s.rinse<.001?contact.bounds.max.z+.4:s.rinse>.999?contact.bounds.min.z-.4:pose.point.z
    items.uniforms.uWet.value=s.rain;items.uniforms.uFoam.value=s.applied;items.uniforms.uRinse.value=s.rinse;items.uniforms.uSurfaceTime.value=s.time
    items.paint.roughness=THREE.MathUtils.lerp(.28,.15,s.rain)
    items.paint.clearcoatRoughness=THREE.MathUtils.lerp(.09,.04,s.rain)
    items.paint.clearcoat=1-s.foam*.85
    items.glass.clearcoat=1-s.foam*.8
    items.glass.transmission=.8*(1-s.foam);items.glass.opacity=1
    items.drops.visible=s.rain>.02;items.dropMaterial.opacity=s.rain*.96
    items.foamMaterial.opacity=1
    updateWaterRunners(items.runners,s.time,s.rain,s.foam)
    for(const m of [items.froth,items.drips])m.visible=s.foam>.01

  })
  return <group name="hero-car">
    <primitive object={items.model}/><primitive object={items.drops}/><primitive object={items.froth}/><primitive object={items.runners.mesh}/><primitive object={items.drips}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]} renderOrder={2}>
      <planeGeometry args={[2.62,5.2]}/><meshBasicMaterial map={shadow} transparent blending={THREE.MultiplyBlending} premultipliedAlpha toneMapped={false} depthWrite={false}/>
    </mesh>
  </group>
}
