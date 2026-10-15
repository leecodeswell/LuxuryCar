import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { applySurface,seededRandom } from './surface-materials.js'

export default function Car({ state,onReady }) {
  const gltf=useGLTF('/models/ferrari.glb','/draco/')
  const shadow=useTexture('/models/ferrari_ao.png')
  const items=useMemo(()=>{
    const rng=seededRandom(458), model=gltf.scene.clone(true)
    model.updateMatrixWorld(true)
    const uniforms={uWet:{value:0},uFoam:{value:0},uSurfaceTime:{value:0}}
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
          applySurface(mesh.material,uniforms)
        }
        if(/leather|interior|carpet/i.test(name)){mesh.material.color.set('#11171c');mesh.material.roughness=.85;mesh.material.metalness=0}
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
    const waterGeometry=new THREE.SphereGeometry(1,8,6),deposits=new Float32Array(2800)
    for(let i=0;i<deposits.length;i++)deposits[i]=rng()*.8
    waterGeometry.setAttribute('aDeposit',new THREE.InstancedBufferAttribute(deposits,1))
    dropMaterial.onBeforeCompile=shader=>{
      shader.uniforms.uWet=uniforms.uWet
      shader.vertexShader='attribute float aDeposit;uniform float uWet;\n'+shader.vertexShader
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed*=smoothstep(aDeposit,aDeposit+.18,uWet);')
    }
    const drops=new THREE.InstancedMesh(waterGeometry,dropMaterial,2800);drops.name='surface-water';drops.frustumCulled=false;drops.visible=false
    for(let i=0;i<2800;i++){
      sample();const r=.0014+Math.pow(rng(),2)*.0048
      dummy.position.copy(point).addScaledVector(normal,r*.26);dummy.quaternion.setFromUnitVectors(up,normal);dummy.scale.set(r,r*.5,r);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix)
    }
    drops.instanceMatrix.needsUpdate=true
    const foamMaterial=new THREE.MeshPhysicalMaterial({color:'#d6e3ec',metalness:0,roughness:.57,clearcoat:.18,clearcoatRoughness:.23,envMapIntensity:.6,transparent:true,opacity:0,alphaTest:.015})
    const foamGeometry=()=>{
      const geometry=new THREE.IcosahedronGeometry(1,0)
      // Radial normals keep tiny bubbles round without adding more triangles.
      geometry.attributes.normal.array.set(geometry.attributes.position.array)
      geometry.normalizeNormals()
      return geometry
    }
    const froth=new THREE.InstancedMesh(foamGeometry(),foamMaterial,9000);froth.name='foam-microbubbles';froth.frustumCulled=false;froth.visible=false
    const trails=[]
    for(let i=0;i<9000;i++){
      sample();const r=.0018+Math.pow(rng(),3)*.007
      dummy.position.copy(point).addScaledVector(normal,.002+r*.25);dummy.quaternion.setFromUnitVectors(up,normal);dummy.scale.set(r,r*.65,r);dummy.updateMatrix();froth.setMatrixAt(i,dummy.matrix)
      if(trails.length<38 && normal.y<.3 && point.y>.4 && Math.abs(point.x)>.65 && rng()<.12){
        const start=point.clone().addScaledVector(normal,.008),end=start.clone().add(new THREE.Vector3(0,-.06-rng()*.15,0))
        const mid=start.clone().lerp(end,.5).addScaledVector(normal,.003)
        trails.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(start,mid,end),5,.002+rng()*.003,5,false))
      }
    }
    const patches=[
      {x:1.15,z:-1.3,sx:.55,sz:.8},{x:1.3,z:.8,sx:.5,sz:1.25},
      {x:-1.15,z:-.9,sx:.52,sz:1.3},{x:-1.2,z:1.65,sx:.5,sz:.8},
      {x:.25,z:2.45,sx:1.2,sz:.45},
    ]
    const poolMaterial=applySurface(new THREE.MeshPhysicalMaterial({color:'#b2c2ce',roughness:.65,clearcoat:.08,envMapIntensity:.45,transparent:true,opacity:0}),uniforms)
    const pools=new THREE.Group();pools.name='foam-runoff-pools';pools.visible=false
    for(const [index,patch] of patches.entries()){
      const geometry=new THREE.CylinderGeometry(1,1,1,64,1),positions=geometry.attributes.position
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),z=positions.getZ(i),angle=Math.atan2(z,x)
        const contour=1+.1*Math.sin(angle*3+index)+.045*Math.sin(angle*7+index*2)
        positions.setX(i,x*contour);positions.setZ(i,z*contour)
      }
      geometry.computeVertexNormals()
      const pool=new THREE.Mesh(geometry,poolMaterial);pool.position.set(patch.x,-.004,patch.z);pool.scale.set(patch.sx,.012,patch.sz);pools.add(pool)
    }
    // Bubble aggregates sit in connected runoff pools, not an even ring of dots.
    const ground=new THREE.InstancedMesh(foamGeometry(),foamMaterial,1000);ground.name='ground-lather';ground.frustumCulled=false;ground.visible=false
    for(let i=0;i<1000;i++){
      const patch=patches[i%patches.length],a=rng()*Math.PI*2,radius=Math.sqrt(rng())*1.04
      const r=.003+rng()*.015
      dummy.position.set(patch.x+Math.cos(a)*radius*patch.sx,.008,patch.z+Math.sin(a)*radius*patch.sz);dummy.quaternion.identity();dummy.scale.set(r,r*.45,r);dummy.updateMatrix();ground.setMatrixAt(i,dummy.matrix)
    }
    const trailGeometry=trails.length?mergeGeometries(trails):new THREE.BufferGeometry()
    trails.forEach(g=>g.dispose())
    const drips=new THREE.Mesh(trailGeometry,foamMaterial);drips.name='soap-runoff';drips.visible=false
    foamMaterial.onBeforeCompile=shader=>{
      shader.uniforms.uFoam=uniforms.uFoam
      shader.vertexShader='varying vec3 vLatherWorld;\n'+shader.vertexShader
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 latherPosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          latherPosition=instanceMatrix*latherPosition;
        #endif
        vLatherWorld=(modelMatrix*latherPosition).xyz;`)
      shader.fragmentShader='uniform float uFoam;varying vec3 vLatherWorld;\n'+shader.fragmentShader
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float front=mix(-2.7,2.9,uFoam);
        diffuseColor.a*=(1.-smoothstep(front-.24,front+.24,vLatherWorld.z))*smoothstep(0.,.06,uFoam);`)
    }
    return {model,paint,glass,uniforms,drops,dropMaterial,foamMaterial,froth,ground,pools,poolMaterial,drips}

  },[gltf])
  useEffect(()=>{onReady()},[onReady])
  useEffect(()=>()=>{
    const materials=new Set()
    items.model.traverse(obj=>{if(obj.isMesh)materials.add(obj.material)})
    materials.forEach(m=>m.dispose())
    for(const mesh of [items.drops,items.froth,items.ground,items.drips])mesh.geometry.dispose()
    items.pools.children.forEach(pool=>pool.geometry.dispose());items.poolMaterial.dispose()
    items.dropMaterial.dispose();items.foamMaterial.dispose()
  },[items])
  useFrame(()=>{
    const s=state.current
    items.uniforms.uWet.value=s.rain;items.uniforms.uFoam.value=s.foam;items.uniforms.uSurfaceTime.value=s.time
    items.paint.roughness=THREE.MathUtils.lerp(.28,.15,s.rain)
    items.paint.clearcoatRoughness=THREE.MathUtils.lerp(.09,.04,s.rain)
    items.paint.clearcoat=1-s.foam*.85
    items.glass.clearcoat=1-s.foam*.8
    items.glass.transmission=.8*(1-s.foam);items.glass.opacity=1
    items.drops.visible=s.rain>.02;items.dropMaterial.opacity=s.rain*.96
    items.foamMaterial.opacity=1;items.poolMaterial.opacity=s.foam
    for(const m of [items.froth,items.ground,items.pools,items.drips])m.visible=s.foam>.01

  })
  return <group name="hero-car">
    <primitive object={items.model}/><primitive object={items.drops}/><primitive object={items.froth}/><primitive object={items.ground}/><primitive object={items.pools}/><primitive object={items.drips}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]} renderOrder={2}>
      <planeGeometry args={[2.62,5.2]}/><meshBasicMaterial map={shadow} transparent blending={THREE.MultiplyBlending} premultipliedAlpha toneMapped={false} depthWrite={false}/>
    </mesh>
  </group>
}
