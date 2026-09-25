import math
from pathlib import Path

import bpy

here = Path(__file__).resolve().parent
w, h, scale = 1672, 941, 0.1
scene = bpy.data.scenes.new('Granada_Alhambra_Layered_Matte')
bpy.context.window.scene = scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 8
scene.render.resolution_x = w
scene.render.resolution_y = h
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = False
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 480
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('Moonlit_World')
scene.world.color = (0, 0, 0)
scene['technique'] = '2.5D projection of the selected concept, not a navigable or reconstructed Alhambra model.'
scene['source'] = '../../design/granada-concepts/01-alhambra-sobre-las-nubes.png'
scene['animation'] = 'Cloud UV advection and pinned cloth shape keys; play frames 1–480. Web animation uses the same analytic cloth waves.'
camera = bpy.data.objects.new('Locked_Projection_Camera', bpy.data.cameras.new('Projection_Lens'))
scene.collection.objects.link(camera)
scene.camera = camera
camera.location = (0, 0, 100)
camera.data.type = 'ORTHO'
camera.data.ortho_scale = w * scale


def material(name, filename, alpha=False, drift=False):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    tree = result.node_tree
    tree.nodes.clear()
    output = tree.nodes.new('ShaderNodeOutputMaterial')
    emit = tree.nodes.new('ShaderNodeEmission')
    texture = tree.nodes.new('ShaderNodeTexImage')
    texture.image = bpy.data.images.load(str(here / filename), check_existing=True)
    texture.extension = 'EXTEND'
    if drift:
        uv = tree.nodes.new('ShaderNodeTexCoord')
        mapping = tree.nodes.new('ShaderNodeMapping')
        tree.links.new(uv.outputs['UV'], mapping.inputs['Vector'])
        tree.links.new(mapping.outputs['Vector'], texture.inputs['Vector'])
        for axis, expression in [(0, '0.003*sin((frame-1)/24*0.075)'), (1, '0.0015*sin((frame-1)/24*0.11)')]:
            mapping.inputs['Location'].driver_add('default_value', axis).driver.expression = expression
    tree.links.new(texture.outputs['Color'], emit.inputs['Color'])
    if alpha:
        transparent = tree.nodes.new('ShaderNodeBsdfTransparent')
        mix = tree.nodes.new('ShaderNodeMixShader')
        tree.links.new(texture.outputs['Alpha'], mix.inputs[0])
        tree.links.new(transparent.outputs[0], mix.inputs[1])
        tree.links.new(emit.outputs[0], mix.inputs[2])
        tree.links.new(mix.outputs[0], output.inputs['Surface'])
    else:
        tree.links.new(emit.outputs[0], output.inputs['Surface'])
    return result


def mesh(name, vertices, faces, coordinates, surface):
    geometry = bpy.data.meshes.new(name)
    geometry.from_pydata(vertices, [], faces)
    uv = geometry.uv_layers.new(name='Projection_UV')
    for polygon in geometry.polygons:
        for index in polygon.loop_indices:
            uv.data[index].uv = coordinates[geometry.loops[index].vertex_index]
    obj = bpy.data.objects.new(name, geometry)
    scene.collection.objects.link(obj)
    obj.data.materials.append(surface)
    return obj


for name, filename, z, alpha in [('Architecture_Sierra_And_Moon', 'plate.png', 0, False), ('Cloud_Sea_Animated', 'cloud-layer.png', 0.04, True)]:
    vertices = [(-w*scale/2, -h*scale/2, z), (w*scale/2, -h*scale/2, z), (w*scale/2, h*scale/2, z), (-w*scale/2, h*scale/2, z)]
    mesh(name, vertices, [(0, 1, 2, 3)], [(0, 0), (1, 0), (1, 1), (0, 1)], material(name, filename, alpha, alpha))
vertices, coordinates, faces = [], [], []
for j in range(9):
    for i in range(33):
        u, v = i/32, j/8
        vertices.append(((938+u*20-w/2)*scale, (h/2-50-v*12-u*2)*scale, 0.1))
        coordinates.append((u, 1-v))
for j in range(8):
    for i in range(32):
        a = j*33+i
        faces.append((a, a+1, a+34, a+33))
flag = mesh('Pinned_Spanish_Flag', vertices, faces, coordinates, material('Flag_Night_Fabric', 'flag.png'))
flag.shape_key_add(name='Basis')
for name, component in [('Wave_Sine', 0), ('Wave_Cosine', 1)]:
    key = flag.shape_key_add(name=name)
    key.slider_min = -1
    for index, item in enumerate(key.data):
        u, v = coordinates[index][0], 1-coordinates[index][1]
        wave = (math.sin if component == 0 else math.cos)(u*8+v*0.8)
        item.co.z += 20*scale*0.14*u*wave
        item.co.y += 12*scale*0.14*u*wave
    key.driver_add('value').driver.expression = ('cos' if component == 0 else '-sin') + '((frame-1)/24*2.4)'
scene.frame_set(1)
bpy.ops.file.pack_all()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(here / 'granada-clouds.blend'))
scene.render.filepath = str(here / 'poster.png')
bpy.ops.render.render(write_still=True)
flag.hide_render = True
scene.objects['Cloud_Sea_Animated'].hide_render = True
scene.render.filepath = str(here / 'plate-render.png')
bpy.ops.render.render(write_still=True)
flag.hide_render = False
scene.objects['Cloud_Sea_Animated'].hide_render = False
scene.frame_set(49)
scene.render.filepath = str(here / 'motion-preview.png')
bpy.ops.render.render(write_still=True)
