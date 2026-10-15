import * as THREE from 'three'

export function seededRandom(seed=458) {
  return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
}

// Shared world-space surface detail: wet paint, gravity rivulets, and foam pores.
// No UV assumption and no per-frame geometry rebuilds.
const surfaceGLSL = `
  uniform float uWet, uFoam, uSurfaceTime;
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
    vec3 p=vSurfacePosition;
    float pooled=noise21(surfaceUV(p)*5.5);
    float runnel=noise21(vec2((p.x+p.z*.6)*37.,p.y*1.8+uSurfaceTime*.025));
    float vertical=1.-abs(normalize(vSurfaceNormal).y);
    float coverage=smoothstep(.06,.2,pooled-vertical*smoothstep(.64,.85,runnel)*.13);
    float front=mix(-2.7,2.9,uFoam);
    float deposit=1.-smoothstep(front-.24,front+.24,p.z+(pooled-.5)*.18);
    return coverage*deposit*smoothstep(0.,.06,uFoam);
  }
  float surfaceHeight() {
    if(uWet<.001 && uFoam<.001)return 0.;
    vec3 p=vSurfacePosition,n=abs(normalize(vSurfaceNormal));
    vec2 uv=n.y>.65?p.xz:n.x>.55?p.zy:p.xy;
    float beads=uWet>.001?beadHeight(uv*145.)*.00017*uWet*(1.-uFoam):0.;
    float trails=pow(noise21(vec2((p.x+p.z*.7)*90.,p.y*3.+uSurfaceTime*.16)),16.)*.0003*uWet*(1.-n.y);
    float lather=uFoam>.001?(foamPores(surfaceUV(p)*340.)*.0008+noise21(surfaceUV(p)*48.)*.0012)*foamCoverage():0.;
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
    shader.vertexShader='uniform float uFoam;varying vec3 vSurfacePosition, vSurfaceNormal;\n'+shader.vertexShader
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed+=normal*.0025*uFoam;
      vSurfacePosition=(modelMatrix*vec4(transformed,1.)).xyz;
      vSurfaceNormal=normalize(mat3(modelMatrix)*normal);`)
    shader.fragmentShader=surfaceGLSL+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float surfaceRelief=surfaceHeight();
      normal=surfaceBump(normal,surfaceRelief,-vViewPosition);`)
    shader.fragmentShader=shader.fragmentShader.replace('#include <clearcoat_normal_fragment_maps>',`#include <clearcoat_normal_fragment_maps>
      #ifdef USE_CLEARCOAT
      clearcoatNormal=surfaceBump(clearcoatNormal,surfaceRelief*(1.-uFoam),-vViewPosition);
      #endif`)
    if(foam) {
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float latherCoverage=foamCoverage();
        float poreTone=uFoam>.001?foamPores(surfaceUV(vSurfacePosition)*340.):1.;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.76,.83,.88)*mix(.81,1.,poreTone),latherCoverage);`)
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=mix(roughnessFactor,.64,latherCoverage);`)
      shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
        metalnessFactor*=1.-latherCoverage;`)
    }
  }
  material.customProgramCacheKey=()=>`aurel-surface-${foam}`
  return material
}
