"""Bake, denoise, grade, and encode the fixed cinematic sequence.
Requires Blender, FFmpeg, OpenEXR, OpenColorIO, NumPy, Pillow, and OIDN.
Normal npm development/build does not invoke this expensive optional command.
"""
import argparse, hashlib, json, os, pathlib, subprocess, sys, time
from grade_frame import grade

ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--blender',default='blender');parser.add_argument('--oidn',required=True)
parser.add_argument('--ocio',default='/usr/share/blender/datafiles/colormanagement/config.ocio')
parser.add_argument('--samples',type=int,default=16);parser.add_argument('--threads',type=int,default=4)
a=parser.parse_args();os.chdir(ROOT)
cache=ROOT/'.cinema-cache';cache.mkdir(exist_ok=True)
source=ROOT/'src/camera-path.json';timeline=json.loads(source.read_text());count=timeline['frames']
# Detect stale generated frames rather than silently mixing different renders.
fingerprint=hashlib.sha256(source.read_bytes()+(ROOT/'scripts/render_film.py').read_bytes()+(ROOT/'scripts/grade_frame.py').read_bytes()+str(a.samples).encode()).hexdigest()
info=cache/'render-info.json'
if info.exists() and json.loads(info.read_text())['fingerprint']!=fingerprint:
    raise SystemExit('Render settings changed. Preserve or remove generated numeric EXR/PNG frames in .cinema-cache before rebaking.')
info.write_text(json.dumps({'fingerprint':fingerprint,'samples':a.samples,'frames':count},indent=2))
environment=os.environ.copy();environment.update({'CINEMA_MODEL':str(cache/'car.glb'),'CINEMA_OUTPUT':str(cache),'CINEMA_SAMPLES':str(a.samples),'XDG_CONFIG_HOME':str(cache/'config'),'XDG_CACHE_HOME':str(cache/'cache')})
log=(cache/'render.log').open('w')
render=subprocess.Popen([a.blender,'-b','-t',str(a.threads),'--python-exit-code','1','--python',str(ROOT/'scripts/render_film.py')],env=environment,stdout=log,stderr=subprocess.STDOUT)
started=time.time();done=set()
try:
    while True:
        for index in range(count):
            png=cache/f'{index:04d}.png';exr=cache/f'{index:04d}.exr'
            if index in done:continue
            if png.exists():done.add(index);continue
            if exr.exists() and time.time()-exr.stat().st_mtime>1:
                grade(exr,png,a.oidn,a.ocio)
                if not png.exists():raise RuntimeError('Missing graded frame '+str(index))
                done.add(index);exr.unlink()
                print(f'FRAME {len(done)}/{count} graded; elapsed {int(time.time()-started)}s',flush=True)
        if render.poll() is not None:
            if render.returncode:raise RuntimeError('Blender failed. See .cinema-cache/render.log')
            if len(done)==count:break
            if not any((cache/f'{i:04d}.exr').exists() for i in range(count) if i not in done):raise RuntimeError('Renderer exited without all frames')
        time.sleep(.5)
finally:
    if render.poll() is None:render.terminate();render.wait()
    log.close()

out=ROOT/'public/cinema';out.mkdir(exist_ok=True)
# Frame interpolation is explicit in the manifest; source frames remain available.
interpolated=cache/'cinematic-master.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-threads',str(a.threads),'-framerate',str(timeline['fps']),'-i',str(cache/'%04d.png'),'-vf',f'minterpolate=fps={timeline["fps"]*2}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-g','1','-movflags','+faststart','-an',str(interpolated)],check=True)
# CFR interpolation discards a boundary frame; encode this common master to both formats.
import shutil
shutil.copy2(interpolated,out/'aurel-cycles.mp4')
subprocess.run(['ffmpeg','-y','-v','error','-threads',str(a.threads),'-i',str(interpolated),'-c:v','libvpx-vp9','-row-mt','1','-crf','22','-b:v','0','-g','8','-an',str(out/'aurel-cycles.webm')],check=True)
from PIL import Image
Image.open(cache/'0000.png').save(out/'poster.webp',quality=94)
manifest={'renderer':'Blender Cycles CPU','lighting':'offline path tracing','sourceWidth':timeline['width'],'sourceHeight':timeline['height'],'sourceFrames':count,'samplesPerPixelMax':a.samples,'denoiser':'Intel Open Image Denoise, normal/albedo guided','color':'AgX, medium high contrast','atmosphere':'depth-composited aerial haze','playback':'paused native video scrubbing; frame interpolation from 16 to 32 fps','renderingAtRuntime':'No path tracing; WebGL fallback uses rasterization','sourceFingerprint':fingerprint}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('CINEMA BAKE COMPLETE',flush=True)
