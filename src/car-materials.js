import * as THREE from 'three'
import {applySurface} from './surface-materials.js'

export const carTextureFiles=['badges.webp','carbon-color.webp','carbon-normal.webp','lens-normal.webp','tail-color.webp','tail-emission.webp']

// The source badge/lens UVs are all zero. Project each separate badge into its
// own atlas tile in world coordinates; do not mutate cached useGLTF geometry.
export function badgeProjection(p,kind) {
  if(kind==='yellow_trim') {
    if(p.z < -1.5)return {tile:0,u:(.013092-p.x)/.03384,v:(p.z+2.120688)/.052485}
    if(Math.abs(p.x)>.6)return {tile:1,u:p.x<0?(p.z+.843653)/.080916:1-(p.z+.843653)/.080916,v:(p.y-.696274)/.083217}
    return {tile:3,u:(p.x+.398046)/.104741,v:(p.y-.769247)/.103245}
  }
  return {tile:2,u:p.x<0?(p.z-kind.z)/kind.radius*.5+.5:-(p.z-kind.z)/kind.radius*.5+.5,v:(p.y-kind.y)/kind.radius*.5+.5}
}

export function tailRegion(p) {
  if(p.z>1.75 && p.y>.73 && Math.abs(p.x)>.55)return 'lamp'
  if(p.z>2 && p.y>.9 && Math.abs(p.x)<.25)return 'brake-strip'
  return 'reflector'
}

export function isReverseLens(p) {
  const x=p.x-(p.x<0?-.7758385:.767899)
  return p.z>2.025 && p.z<2.06 && x*x+(p.y-.8754365)**2<.05**2
}

export function upgradeCarMaterials(model,sourceTextures,uniforms,anisotropy=8) {
  const textures=sourceTextures.map(t=>t.clone()),ownedGeometry=[]
  const [badges,carbonColor,carbonNormal,lensNormal,tailColor,tailEmission]=textures
  textures.forEach(t=>{t.anisotropy=anisotropy;t.needsUpdate=true})
  for(const t of [badges,carbonColor,tailColor,tailEmission])t.colorSpace=THREE.SRGBColorSpace
  for(const t of [carbonColor,carbonNormal]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1)}
  const physical=(name,settings,foam=true,finish='')=>{
    const m=new THREE.MeshPhysicalMaterial(settings);m.name=name
    return applySurface(m,uniforms,{foam,finish})
  }
  const paint=physical('graphite multilayer clearcoat',{color:'#424d52',metalness:.78,roughness:.27,clearcoat:1,clearcoatRoughness:.065,envMapIntensity:.9},true,'paint')
  const glass=physical('automotive laminated glass',{color:'#adbcc3',roughness:.025,transmission:.8,thickness:.008,ior:1.46,clearcoat:1,envMapIntensity:.5})
  const wheel=physical('satin forged alloy',{color:'#252c30',metalness:1,roughness:.28,clearcoat:.35,clearcoatRoughness:.16,envMapIntensity:.65})
  const badge=physical('printed enamel badges',{map:badges,metalness:.12,roughness:.24,clearcoat:1,clearcoatRoughness:.07,ior:1.5,envMapIntensity:.85})
  const carbon=physical('resin coated twill carbon',{map:carbonColor,normalMap:carbonNormal,normalScale:new THREE.Vector2(.3,.3),metalness:.22,roughness:.38,clearcoat:1,clearcoatRoughness:.16,envMapIntensity:.65})
  const leather=physical('fine leather grain',{color:'#12181b',roughness:.78,sheen:.2,sheenRoughness:.8,sheenColor:'#3c4143'},false,'leather')
  const rubber=physical('moulded tire rubber',{color:'#171a1c',roughness:.86},true,'rubber')
  const chrome=physical('polished emblem and trim',{color:'#b8bec1',metalness:1,roughness:.18,envMapIntensity:1})
  const metal=physical('brushed metal hardware',{color:'#70797f',metalness:1,roughness:.32,envMapIntensity:.7})
  // Lens colour is separate from its annular light guide. A dark centre and
  // restrained emission retain the moulded geometry instead of glowing discs.
  const tail=physical('ribbed red polycarbonate',{map:tailColor,normalMap:lensNormal,normalScale:new THREE.Vector2(.3,.3),emissive:'#ff2711',emissiveMap:tailEmission,emissiveIntensity:2.4,roughness:.16,metalness:0,clearcoat:1,clearcoatRoughness:.06,ior:1.49,envMapIntensity:1})
  const stop=physical('centre brake LEDs',{color:'#650506',emissive:'#ff1004',emissiveIntensity:1.2,roughness:.2,clearcoat:1})
  const reflector=physical('unlit red reflectors',{color:'#58090a',roughness:.22,clearcoat:1,clearcoatRoughness:.08,ior:1.49})
  const caliper=physical('red painted brake caliper',{color:'#a51712',metalness:.35,roughness:.32,clearcoat:.65})
  const front=physical('headlamp optical cover',{color:'#b9c5ce',metalness:.25,roughness:.12,clearcoat:1,clearcoatRoughness:.035,envMapIntensity:1})
  const reverse=physical('clear reverse lamp optics',{color:'#8d979d',metalness:0,roughness:.24,normalMap:lensNormal,normalScale:new THREE.Vector2(.45,.45),clearcoat:1,clearcoatRoughness:.12,ior:1.49,envMapIntensity:.55})
  const guide=physical('red LED diffuser',{color:'#9b0803',emissive:'#ff1707',emissiveIntensity:2.8,roughness:.26,clearcoat:.4})
  const materials=new Set([paint,glass,wheel,badge,carbon,leather,rubber,chrome,metal,tail,stop,reflector,caliper,front,reverse,guide])
  const p=new THREE.Vector3()
  function project(mesh,mapper) {
    const g=mesh.geometry.clone(),a=g.attributes.position,uv=new Float32Array(a.count*2)
    for(let i=0;i<a.count;i++){
      p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld)
      const value=mapper(p);uv[i*2]=value[0];uv[i*2+1]=value[1]
    }
    g.setAttribute('uv',new THREE.BufferAttribute(uv,2));mesh.geometry=g;ownedGeometry.push(g)
    return g
  }
  function planar(mesh,scale){
    const n=new THREE.Vector3(),matrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
    const normals=mesh.geometry.attributes.normal
    let index=0
    project(mesh,p=>{
      n.fromBufferAttribute(normals,index++).applyMatrix3(matrix)
      const a=[Math.abs(n.x),Math.abs(n.y),Math.abs(n.z)]
      return a[1]>a[0]&&a[1]>a[2]?[p.x*scale,p.z*scale]:a[0]>a[2]?[p.z*scale,p.y*scale]:[p.x*scale,p.y*scale]
    })
  }
  model.traverse(mesh=>{
    if(!mesh.isMesh)return
    mesh.castShadow=true;mesh.receiveShadow=true
    const name=mesh.material.name
    if(mesh.name==='body')mesh.material=paint
    else if(mesh.name==='glass')mesh.material=glass
    else if(/^rim_|^wheel(?:_\d+)?$/.test(mesh.name))mesh.material=wheel
    else if(name==='Ferrari_Yellow'){
      mesh.material=badge
      const bounds=new THREE.Box3().setFromObject(mesh),center=bounds.getCenter(new THREE.Vector3())
      const kind=mesh.name==='yellow_trim'?'yellow_trim':{z:center.z,y:center.y,radius:(bounds.max.y-bounds.min.y)*.5}
      project(mesh,p=>{
        // Steering badge faces the cabin, so project across X instead of Z.
        const v=mesh.name==='steering_centre'?{tile:2,u:(p.x-center.x)/(bounds.max.x-bounds.min.x)+.5,v:(p.y-center.y)/(bounds.max.y-bounds.min.y)+.5}:badgeProjection(p,kind)
        const u=THREE.MathUtils.clamp(v.u,.015,.985),vv=THREE.MathUtils.clamp(v.v,.015,.985)
        return [(v.tile%2+u)*.5,(v.tile<2?1:.5)-.5+vv*.5]
      })
    } else if(mesh.name==='lights_red'){
      mesh.material=[tail,stop,reflector]
      const g=project(mesh,p=>[(p.x-(p.x<0?-.7758385:.767899))/.185+.5,(p.y-.8754365)/.185+.5])
      g.clearGroups()
      const position=g.attributes.position,idx=g.index,count=idx?idx.count:position.count
      const groups=[[],[],[]]
      for(let i=0;i<count;i+=3){
        p.set(0,0,0)
        for(let j=0;j<3;j++)p.add(new THREE.Vector3().fromBufferAttribute(position,idx?idx.getX(i+j):i+j))
        p.multiplyScalar(1/3).applyMatrix4(mesh.matrixWorld)
        const region=tailRegion(p),material=region==='lamp'?0:region==='brake-strip'?1:2
        for(let j=0;j<3;j++)groups[material].push(idx?idx.getX(i+j):i+j)
      }
      g.setIndex(groups.flat())
      let start=0
      groups.forEach((indices,material)=>{if(indices.length)g.addGroup(start,indices.length,material);start+=indices.length})
    } else if(mesh.name==='brakes')mesh.material=caliper
    else if(/Taillight/i.test(name))mesh.material=reflector
    else if(/Projector/i.test(name))mesh.material=front
    else if(/carbon/i.test(name)){mesh.material=carbon;planar(mesh,24)}
    else if(/tire/i.test(name))mesh.material=rubber
    else if(/leather|interior|carpet/i.test(name))mesh.material=leather
    else if(/metal_chrome/i.test(name)){
      mesh.material=[chrome,reverse]
      const g=project(mesh,p=>[(p.x-(p.x<0?-.7758385:.767899))/.1+.5,(p.y-.8754365)/.1+.5])
      const position=g.attributes.position,idx=g.index,count=idx?idx.count:position.count,groups=[[],[]]
      for(let i=0;i<count;i+=3){
        p.set(0,0,0)
        for(let j=0;j<3;j++)p.add(new THREE.Vector3().fromBufferAttribute(position,idx?idx.getX(i+j):i+j))
        p.multiplyScalar(1/3).applyMatrix4(mesh.matrixWorld)
        const group=isReverseLens(p)?1:0
        for(let j=0;j<3;j++)groups[group].push(idx?idx.getX(i+j):i+j)
      }
      g.setIndex(groups.flat());g.clearGroups()
      g.addGroup(0,groups[0].length,0);g.addGroup(groups[0].length,groups[1].length,1)
    }
    else if(/metal_gray/i.test(name))mesh.material=metal
    else {
      mesh.material=mesh.material.clone();materials.add(mesh.material)
      applySurface(mesh.material,uniforms,{foam:!(/glass|light/i.test(name))})
    }
  })
  for(const [side,x,z] of [['left',-.7758385,2.053],['right',.767899,2.052]]){
    const geometry=new THREE.TorusGeometry(.074,.0025,8,96)
    ownedGeometry.push(geometry)
    const ring=new THREE.Mesh(geometry,guide);ring.name=`tail-light-guide-${side}`
    ring.position.set(x,.8754365,z);model.attach(ring)
  }
  return {paint,glass,dispose(){materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());ownedGeometry.forEach(g=>g.dispose())}}
}
