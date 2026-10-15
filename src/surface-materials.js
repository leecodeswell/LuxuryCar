import * as THREE from 'three'

export function seededRandom(seed=458) {
  return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
}

// Shared by paint displacement and geometric froth so the same exposed patches
// and pressure-wash front remain attached to the body across all three passes.
export const latherGLSL = `
  uniform float uFoam,uRinse,uWashZ;
  float latherHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float latherNoise(vec2 p){
    vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(latherHash(i),latherHash(i+vec2(1,0)),f.x),
      mix(latherHash(i+vec2(0,1)),latherHash(i+1.),f.x),f.y);
  }
  float latherMask(vec3 p) {
    vec2 uv=vec2(p.x+p.z*.43,p.y+p.z*.31);
    float warp=latherNoise(uv*4.1+vec2(3.7,8.2));
    float patchiness=latherNoise(uv*6.3+warp*.85)*.72+latherNoise(uv*17.9)*.28;
    float streak=(latherNoise(vec2((p.x+p.z*.61)*48.,p.y*2.4))-.5)*.14;
    float coverage=mix(.96,1.,patchiness+streak*.2);
    float depositFront=mix(-2.7,2.9,uFoam);
    float deposit=(1.-smoothstep(depositFront-.24,depositFront+.24,p.z))*smoothstep(0.,.06,uFoam);
    // Rinse moves rear to front, independently of the front-to-rear deposition.
    float washFront=uWashZ;
    float unevenEdge=.1*sin(p.x*14.+p.y*11.)+.045*sin(p.z*31.);
    float remaining=1.-smoothstep(washFront-.22,washFront+.22,p.z+unevenEdge);
    return coverage*deposit*remaining;
  }
`

// Shared world-space surface detail: wet paint, gravity rivulets, and foam pores.
// No UV assumption and no per-frame geometry rebuilds.
const surfaceGLSL = `
  uniform float uWet, uSurfaceTime;
  ${latherGLSL}
  varying vec3 vSurfacePosition, vSurfaceNormal;
  float hash21(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise21(vec2 p) {
    vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);
  }
  vec2 surfaceUV(vec3 p) { return vec2(p.x+p.z*.63,p.y+p.z*.37); }
  float beadHeight(vec2 p) {
    vec2 cell=floor(p),f=fract(p);float h=0.;
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++) {
      vec2 id=cell+vec2(float(x),float(y));
      float seed=hash21(id), r=.08+hash21(id+9.)*.22;
      vec2 center=vec2(hash21(id+2.),hash21(id+7.))*.5+.25;
      float d=length(f-vec2(float(x),float(y))-center);
      float edge=max(fwidth(d),.012);
      h=max(h,sqrt(max(0.,1.-pow(d/r,2.)))*(1.-smoothstep(r-edge,r+edge,d))*smoothstep(seed-.08,seed+.08,uWet*.9));
    }
    return h;
  }
  float foamPores(vec2 p) {
    vec2 cell=floor(p),f=fract(p);float distanceToCell=1.;
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++) {
      vec2 id=cell+vec2(float(x),float(y));vec2 center=vec2(hash21(id),hash21(id+6.));
      distanceToCell=min(distanceToCell,length(f-vec2(float(x),float(y))-center));
    }
    return smoothstep(.02,.4,distanceToCell);
  }
  float foamCoverage() {
    if(uFoam<.001)return 0.;
    return latherMask(vSurfacePosition);
  }

  float surfaceHeight() {
    if(uWet<.001 && uFoam<.001)return 0.;
    vec3 p=vSurfacePosition,n=abs(normalize(vSurfaceNormal));
    vec2 uv=n.y>.65?p.xz:n.x>.55?p.zy:p.xy;
    float beads=uWet>.001?(beadHeight(uv*145.)*.00017+pow(noise21(uv*470.),10.)*.00008)*uWet*(1.-foamCoverage()):0.;
    float trails=pow(noise21(vec2((p.x+p.z*.7)*90.,p.y*3.+uSurfaceTime*.16)),16.)*.0003*uWet*(1.-n.y);
    float lather=uFoam>.001?(foamPores(surfaceUV(p)*260.)*.0016+noise21(surfaceUV(p)*38.)*.0028)*foamCoverage():0.;
    return beads+trails+lather;
  }
  vec3 surfaceBump(vec3 sourceNormal,float height,vec3 viewPosition) {
    vec3 dx=dFdx(viewPosition),dy=dFdy(viewPosition);
    vec3 r1=cross(dy,sourceNormal),r2=cross(sourceNormal,dx);
    float det=dot(dx,r1);
    vec3 gradient=sign(det)*(dFdx(height)*r1+dFdy(height)*r2);
    return normalize(abs(det)*sourceNormal-gradient);
  }
`
export function applySurface(material, uniforms, {foam=true}={}) {
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms)
    shader.vertexShader=latherGLSL+'varying vec3 vSurfacePosition, vSurfaceNormal;\n'+shader.vertexShader
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 coatWorld=(modelMatrix*vec4(transformed,1.)).xyz;
      float coatDeposit=${foam?'latherMask(coatWorld)':'0.'};
      float thickness=.018+.004*sin(coatWorld.x*39.+coatWorld.z*33.)*sin(coatWorld.y*41.-coatWorld.z*27.);
      transformed+=normal*thickness*coatDeposit;
      vSurfacePosition=(modelMatrix*vec4(transformed,1.)).xyz;
      vSurfaceNormal=normalize(mat3(modelMatrix)*normal);`)
    shader.fragmentShader=(foam?surfaceGLSL:surfaceGLSL.replace('return latherMask(vSurfacePosition);','return 0.;'))+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float surfaceRelief=surfaceHeight();
      normal=surfaceBump(normal,surfaceRelief,-vViewPosition);`)
    shader.fragmentShader=shader.fragmentShader.replace('#include <clearcoat_normal_fragment_maps>',`#include <clearcoat_normal_fragment_maps>
      #ifdef USE_CLEARCOAT
      clearcoatNormal=surfaceBump(clearcoatNormal,surfaceRelief*(1.-foamCoverage()),-vViewPosition);
      #endif`)
    if(foam) {
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        totalEmissiveRadiance*=1.-foamCoverage();`)
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float latherCoverage=foamCoverage();
        float poreTone=uFoam>.001?foamPores(surfaceUV(vSurfacePosition)*340.):1.;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.91,.95)*mix(.9,1.,poreTone),latherCoverage);`)
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=mix(roughnessFactor,.82,latherCoverage);`)
      shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
        metalnessFactor*=1.-latherCoverage;`)
    }
  }
  material.customProgramCacheKey=()=>`aurel-surface-${foam}`
  return material
}
