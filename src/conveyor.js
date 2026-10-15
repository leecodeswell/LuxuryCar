import * as THREE from 'three'

// Real raised channels, round diffusers, slats and end caps. Instancing keeps
// the wash floor inexpensive while both the main and reflected cameras see it.
export function createConveyor() {
  const group=new THREE.Group();group.name='wash-conveyor';group.visible=false
  const uniforms={uConveyorTime:{value:0},uConveyorGlow:{value:0}}
  const metal=new THREE.MeshStandardMaterial({color:'#17232c',metalness:.85,roughness:.32})
  const belt=new THREE.MeshStandardMaterial({color:'#111b21',metalness:.45,roughness:.58})
  const led=new THREE.MeshStandardMaterial({color:'#8ae7f2',emissive:'#28bcd9',emissiveIntensity:3,toneMapped:false,roughness:.25})
  led.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms)
    shader.vertexShader='varying float vConveyorZ;\n'+shader.vertexShader
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vConveyorZ=(modelMatrix*instanceMatrix*vec4(transformed,1.)).z;`)
    shader.fragmentShader='uniform float uConveyorTime,uConveyorGlow;varying float vConveyorZ;\n'+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float chase=pow(.5+.5*sin(vConveyorZ*2.6+uConveyorTime*4.),6.);
      totalEmissiveRadiance*=uConveyorGlow*(.72+1.28*chase);`)
  }
  const dummy=new THREE.Object3D()
  const instances=(name,geometry,material,count)=>{
    const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;mesh.frustumCulled=false;group.add(mesh);return mesh
  }
  const place=(mesh,i,x,y,z,axis='z')=>{
    dummy.position.set(x,y,z);dummy.rotation.set(0,0,0)
    if(mesh.geometry.type==='CapsuleGeometry')axis==='z'?dummy.rotation.x=Math.PI/2:dummy.rotation.z=Math.PI/2
    dummy.scale.setScalar(1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)
  }
  const channels=instances('conveyor-rail-housings',new THREE.BoxGeometry(.14,.055,18),metal,2)
  const rails=instances('conveyor-rail-diffusers',new THREE.CapsuleGeometry(.028,17.9,4,10),led,2)
  const caps=instances('conveyor-end-caps',new THREE.CapsuleGeometry(.055,.04,4,10),metal,4)
  for(let i=0;i<2;i++){
    const x=i?2.1:-2.1
    place(channels,i,x,.0125,0);place(rails,i,x,.055,0)
    for(let end=0;end<2;end++)place(caps,i*2+end,x,.055,end?8.98:-8.98)
  }
  const slatCount=164,barCount=10
  const slats=instances('conveyor-belt-slats',new THREE.BoxGeometry(.5,.045,.14),belt,slatCount)
  const inserts=instances('conveyor-slat-leds',new THREE.CapsuleGeometry(.014,.35,3,8),led,slatCount)
  const barHousings=instances('conveyor-crossbar-housings',new THREE.BoxGeometry(3.9,.035,.09),metal,barCount)
  const bars=instances('conveyor-crossbar-leds',new THREE.CapsuleGeometry(.017,3.77,3,8),led,barCount)
  const moving=[slats,inserts,barHousings,bars]
  moving.forEach(mesh=>mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage))
  const update=(time,glow,blackout=0)=>{
    group.visible=glow>.002
    uniforms.uConveyorTime.value=time;uniforms.uConveyorGlow.value=glow*(1-blackout)
    if(!group.visible)return
    for(let i=0;i<slatCount;i++){
      const x=i%2?2.68:-2.68,z=((Math.floor(i/2)*18/82+time*.65)%18)-9
      place(slats,i,x,.0075,z);place(inserts,i,x,.04,z,'x')
    }
    for(let i=0;i<barCount;i++){
      const z=((i*1.8+time*.65)%18)-9
      place(barHousings,i,0,.0025,z);place(bars,i,0,.035,z,'x')
    }
    moving.forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true})
  }
  group.traverse(mesh=>{if(mesh.isInstancedMesh)mesh.instanceMatrix.needsUpdate=true})
  return {group,uniforms,update,dispose(){
    group.children.forEach(mesh=>mesh.geometry.dispose())
    for(const material of [metal,belt,led])material.dispose()
  }}
}
