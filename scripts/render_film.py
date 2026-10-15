"""Blender/Cycles cinematic master. Run via Blender's --python option.

Environment: CINEMA_MODEL (decompressed GLB), CINEMA_OUTPUT (cache directory),
CINEMA_SAMPLES (default 16), CINEMA_START / CINEMA_END (inclusive frames).
Every frame is linear multilayer EXR with albedo and normal denoising guides.
"""
import bpy, bmesh, bisect, json, math, os, pathlib, random, time
from mathutils import Vector
ROOT = pathlib.Path(__file__).resolve().parents[1]
TIMELINE = json.loads((ROOT / 'src/camera-path.json').read_text())
OUT = pathlib.Path(os.environ.get('CINEMA_OUTPUT', ROOT / '.cinema-cache'))
OUT.mkdir(parents=True, exist_ok=True)
random.seed(458)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.environ.get('CINEMA_MODEL', '/tmp/aurel-blender/car.glb'))


def mat(name, color, metal=0, rough=.3):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    return material, bsdf


paint, pb = mat('Graphite metallic / clearcoat', (.035,.045,.055), .85, .29)
pb.inputs['Coat Weight'].default_value=.65
pb.inputs['Coat Roughness'].default_value=.15
noise=paint.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1100;noise.inputs['Detail'].default_value=2
bump=paint.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.08;bump.inputs['Distance'].default_value=.00006
paint.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);paint.node_tree.links.new(bump.outputs['Normal'],pb.inputs['Normal'])
wheel,wb=mat('Forged aluminium',(.075,.083,.09),.94,.23)
metal,mb=mat('Machined steel',(.22,.24,.25),.94,.42)
leather,lb=mat('Leather',(.012,.015,.014),0,.68)
rubber,rb=mat('Rubber',(.008,.01,.012),0,.84)
carbon,cb=mat('Carbon',(.008,.012,.014),.3,.36);cb.inputs['Coat Weight'].default_value=.4
plastic,_=mat('Satin black polymer',(.012,.015,.018),0,.4)
glass,gb=mat('Optical glass',(.82,.9,.93),0,.035);gb.inputs['Transmission Weight'].default_value=1;gb.inputs['IOR'].default_value=1.46
red,redb=mat('Tail lamp optical red',(.18,.002,.003),.1,.17);redb.inputs['Emission Color'].default_value=(.45,.001,.002,1);redb.inputs['Emission Strength'].default_value=.3
headlamp,hb=mat('Headlamp LED',(.2,.3,.45),.1,.12);hb.inputs['Emission Color'].default_value=(.5,.7,1,1);hb.inputs['Emission Strength'].default_value=2
body=None
for obj in list(bpy.data.objects):
    if obj.type!='MESH': continue
    for poly in obj.data.polygons: poly.use_smooth=True
    for i, material in enumerate(obj.data.materials):
        name=material.name.lower()
        if obj.name=='body': obj.data.materials[i]=paint;body=obj
        elif obj.name=='glass': obj.data.materials[i]=glass
        elif obj.name.startswith(('rim_','wheel')): obj.data.materials[i]=wheel
        elif 'metal' in name: obj.data.materials[i]=metal
        elif 'carbon' in name: obj.data.materials[i]=carbon
        elif any(s in name for s in ['leather','interior','carpet']): obj.data.materials[i]=leather
        elif 'tire' in name: obj.data.materials[i]=rubber
        elif 'plastic' in name: obj.data.materials[i]=plastic
        elif 'taillight' in name: obj.data.materials[i]=red
        elif 'projector' in name: obj.data.materials[i]=headlamp
    obj.cycles.use_motion_blur=False
    if obj.name in ['body','glass']:
        bpy.context.view_layer.objects.active=obj
        if obj.data.has_custom_normals:
            bpy.ops.mesh.customdata_custom_splitnormals_clear()
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free();obj.data.update()

# A real dielectric water surface; beads are geometry rather than white dots.
water,waterb=mat('Water / IOR 1.333',(1,1,1),0,.025)
waterb.inputs['Transmission Weight'].default_value=1;waterb.inputs['IOR'].default_value=1.333
body.data.calc_loop_triangles()
triangles=list(body.data.loop_triangles);weights=[];total=0
for tri in triangles: total+=tri.area;weights.append(total)
verts=[];faces=[];matrix=body.matrix_world;normal_matrix=matrix.to_3x3().inverted().transposed()
for i in range(3500):
    for attempt in range(50):
        tri=triangles[bisect.bisect_left(weights,random.random()*total)]
        normal=(normal_matrix@tri.normal).normalized()
        if normal.z>-.05: break
    r1=math.sqrt(random.random());r2=random.random()
    a,b,c=[matrix@body.data.vertices[k].co for k in tri.vertices]
    point=a*(1-r1)+b*(r1*(1-r2))+c*(r1*r2)
    radius=.0012+random.random()**2*.0038
    normal=normal.normalized();u=normal.cross(Vector((0,0,1)))
    if u.length<.1:u=normal.cross(Vector((0,1,0)))
    u.normalize();v=normal.cross(u).normalized();base=len(verts)
    for lat in range(5):
        phi=math.pi*lat/4
        for lon in range(8):
            theta=2*math.pi*lon/8
            q=point+u*(radius*math.sin(phi)*math.cos(theta))+v*(radius*math.sin(phi)*math.sin(theta))+normal*(radius*.62*math.cos(phi)+radius*.2)
            verts.append(tuple(q))
    for lat in range(4):
        for lon in range(8):
            j=base+lat*8+lon;k=base+lat*8+(lon+1)%8
            faces.append((j,k,k+8,j+8))
mesh=bpy.data.meshes.new('Condensation');mesh.from_pydata(verts,[],faces);mesh.update()
beads=bpy.data.objects.new('Condensation',mesh);bpy.context.collection.objects.link(beads);mesh.materials.append(water)
for poly in mesh.polygons: poly.use_smooth=True

floor,fb=mat('Dark sealed concrete',(.003,.004,.005),0,.5)
fb.inputs['Specular IOR Level'].default_value=.2
bpy.ops.mesh.primitive_plane_add(size=160,location=(0,0,-.015));bpy.context.object.name='Studio floor';bpy.context.object.data.materials.append(floor)
wall,_=mat('Charcoal architecture',(.004,.006,.009),.1,.65)
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=12,depth=14,end_fill_type='NOTHING',location=(0,0,7));room=bpy.context.object;room.name='Continuous cyclorama';room.data.materials.append(wall)
for poly in room.data.polygons:poly.use_smooth=True
# Recessed architectural piers give the room scale and layered silhouettes.
for x in [-8,-6,-4,0,4,6,8]:
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-9.85,3));o=bpy.context.object;o.scale=(.045,.12,3);o.data.materials.append(wall)


def area(name,pos,power,color,size,size_y,target=(0,0,.6)):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='RECTANGLE';data.size=size;data.size_y=size_y
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=pos;obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    return obj

area('Overhead silk',(0,0,6),650,(.85,.92,1),2.8,6.5)
area('Cool contour',(-4,-.5,2.8),850,(.5,.7,1),.5,6)
area('Neutral contour',(4,1,3),800,(1,.94,.86),.65,6)
area('Back rim',(-1,-5,4),1000,(.6,.78,1),2,3)
area('Front fill',(0,6,3),200,(.7,.82,1),3,2)
world=bpy.data.worlds.new('Night');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.04,.06,.09,1);world.node_tree.nodes['Background'].inputs[1].default_value=.025;bpy.context.scene.world=world

# Physical emissive architecture, reflected in paint and floor.
strip,stripb=mat('Recessed light',(.4,.6,.8),0,.2);stripb.inputs['Emission Color'].default_value=(.32,.55,.85,1);stripb.inputs['Emission Strength'].default_value=2
for x in [-6,6]:
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-9.65,3.2));o=bpy.context.object;o.scale=(.018,.02,2.4);o.data.materials.append(strip)

# Short crossed ribbons represent the exposure of falling drops.
rainmat,rainb=mat('Rain streak',(.25,.4,.55),.0,.15)
rainb.inputs['Emission Color'].default_value=(.2,.32,.46,1);rainb.inputs['Emission Strength'].default_value=.6
rainverts=[];rainfaces=[];rainseeds=[]
for i in range(650):
    x=random.uniform(-6,6);y=random.uniform(-6,6);z=random.uniform(.2,6);length=random.uniform(.035,.13);width=random.uniform(.0005,.0014)
    rainseeds.append((x,y,z,length,width))
    j=len(rainverts)
    rainverts.extend([(x-width,y,z),(x+width,y,z),(x+width+.008,y,z+length),(x-width+.008,y,z+length),(x,y-width,z),(x,y+width,z),(x+.008,y+width,z+length),(x+.008,y-width,z+length)])
    rainfaces.extend([(j,j+1,j+2,j+3),(j+4,j+5,j+6,j+7)])
rm=bpy.data.meshes.new('Rain');rm.from_pydata(rainverts,[],rainfaces);rm.materials.append(rainmat)
rain=bpy.data.objects.new('Rain',rm);bpy.context.collection.objects.link(rain)

camdata=bpy.data.cameras.new('Cinematic drone');camdata.sensor_width=36;camdata.clip_end=200
cam=bpy.data.objects.new('Cinematic drone',camdata);bpy.context.collection.objects.link(cam)
focus=bpy.data.objects.new('Focus',None);bpy.context.collection.objects.link(focus)
camdata.dof.use_dof=True;camdata.dof.focus_object=focus;camdata.dof.aperture_fstop=8
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.use_denoising=False
scene.cycles.samples=int(os.environ.get('CINEMA_SAMPLES','16'));scene.cycles.adaptive_threshold=.08;scene.cycles.adaptive_min_samples=4
scene.cycles.max_bounces=4;scene.cycles.transmission_bounces=5;scene.cycles.transparent_max_bounces=6;scene.cycles.volume_bounces=0
scene.render.use_persistent_data=True;scene.render.resolution_x=TIMELINE['width'];scene.render.resolution_y=TIMELINE['height'];scene.render.resolution_percentage=100
scene.view_layers[0].use_pass_normal=True;scene.view_layers[0].use_pass_diffuse_color=True;scene.view_layers[0].use_pass_z=True
scene.render.image_settings.file_format='OPEN_EXR_MULTILAYER';scene.render.image_settings.color_depth='16'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'


def at(p,key):
    knots=TIMELINE['knots'];i=next((j for j in range(len(knots)-1) if p<=knots[j+1]['p']),len(knots)-2)
    a,b=knots[i],knots[i+1];before=knots[max(0,i-1)];after=knots[min(len(knots)-1,i+2)]
    t=(p-a['p'])/(b['p']-a['p']);span=b['p']-a['p']
    def hermite(v0,v1,vprev,vnext):
        m0=(v1-vprev)/(b['p']-before['p']);m1=(vnext-v0)/(after['p']-a['p'])
        return (2*t**3-3*t*t+1)*v0+(t**3-2*t*t+t)*span*m0+(-2*t**3+3*t*t)*v1+(t**3-t*t)*span*m1
    if isinstance(a[key],list):return [hermite(a[key][k],b[key][k],before[key][k],after[key][k]) for k in range(3)]
    return hermite(a[key],b[key],before[key],after[key])


def convert(v):return Vector((v[0],-v[2],v[1]))


def setup_frame(index):
    p=index/(TIMELINE['frames']-1);cam.location=convert(at(p,'position'));target=convert(at(p,'target'));focus.location=target
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.rotation_euler.rotate_axis('Z',at(p,'roll'))
    camdata.lens=36/(2*math.tan(math.radians(at(p,'fov'))/2))
    wet=min(1,max(0,(p-TIMELINE['rainStart'])/(TIMELINE['rainFull']-TIMELINE['rainStart'])));wet=wet*wet*(3-2*wet)
    beads.hide_render=wet<.05;rain.hide_render=wet<.05
    pb.inputs['Roughness'].default_value=.24-.07*wet;pb.inputs['Coat Roughness'].default_value=.15-.07*wet
    fb.inputs['Roughness'].default_value=.5-.22*wet
    for i,(x,y,z,length,width) in enumerate(rainseeds):
        height=(z-index*.11)%6
        coords=[(x-width,y,height),(x+width,y,height),(x+width+.008,y,height+length),(x-width+.008,y,height+length),(x,y-width,height),(x,y+width,height),(x+.008,y+width,height+length),(x+.008,y-width,height+length)]
        for k,co in enumerate(coords):rm.vertices[i*8+k].co=co
    rm.update()
    # Fixed pixel random sequence limits grain movement during slow scrubbing.
    scene.cycles.seed=458
    scene.render.filepath=str(OUT/f'{index:04d}.exr')


setup_frame(0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cinema-master.blend'))
start=int(os.environ.get('CINEMA_START','0'));end=int(os.environ.get('CINEMA_END',str(TIMELINE['frames']-1)))
indices=list(map(int,os.environ['CINEMA_FRAMES'].split(','))) if os.environ.get('CINEMA_FRAMES') else range(start,end+1)
for index in indices:
    destination=OUT/f'{index:04d}.exr'
    if destination.exists() or (OUT/f'{index:04d}.png').exists():continue
    setup_frame(index);begin=time.time();bpy.ops.render.render(write_still=True)
    print(f'CINEMA_FRAME {index} / {TIMELINE["frames"]} seconds={time.time()-begin:.2f}',flush=True)
