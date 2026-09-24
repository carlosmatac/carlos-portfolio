import argparse
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def node(tree, kind, name=None):
    result = tree.nodes.new(kind)
    if name:
        result.name = result.label = name
    return result


def math_node(tree, operation, a, b):
    item = node(tree, 'ShaderNodeMath')
    item.operation = operation
    for i, value in enumerate((a, b)):
        if isinstance(value, (float, int)):
            item.inputs[i].default_value = value
        else:
            tree.links.new(value, item.inputs[i])
    return item.outputs[0]


def vector_node(tree, operation, a, b):
    item = node(tree, 'ShaderNodeVectorMath')
    item.operation = operation
    tree.links.new(a, item.inputs[0])
    if isinstance(b, tuple):
        item.inputs[1].default_value = b
    else:
        tree.links.new(b, item.inputs[1])
    return item.outputs[0]


def area(scene, name, location, power, size, color, target, size_y=None):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.color = color
    data.shape = 'RECTANGLE'
    data.size = size
    data.size_y = size if size_y is None else size_y
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)
    return obj


def setup_scene(name, width, height, samples):
    scene = bpy.data.scenes.new(name)
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.015
    scene.cycles.max_bounces = 8
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 6
    scene.cycles.volume_bounces = 2
    scene.cycles.transparent_max_bounces = 8
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '16'
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = min(8, os.cpu_count() or 4)
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = 0
    camera = bpy.data.objects.new(name + '_Camera', bpy.data.cameras.new(name + '_Lens'))
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera.data.type = 'ORTHO'
    camera.data.lens = 70
    scene.world = bpy.data.worlds.new(name + '_World')
    scene.world.use_nodes = True
    scene['asset_kind'] = 'Original layered render; not a navigable city model'
    return scene


def create_arch(samples=128, width=1920, height=2240):
    scene = setup_scene('Portfolio_Arch_Studio', width, height, samples)
    h, k, count = 40, 2.5, 512
    vertices, faces, uvs = [], [], []
    for face in range(3):
        for i in range(count + 1):
            x = 2 * i / count - 1
            z = h * (math.cosh(k) - math.cosh(k * x)) / (math.cosh(k) - 1)
            tangent = Vector((h / 2, 0, -h * k * math.sinh(k * x) / (math.cosh(k) - 1))).normalized()
            side = Vector((-tangent.z, 0, tangent.x))
            radius = h * (0.0156 + (0.0495 - 0.0156) * abs(x) ** 1.4)
            for j in (face, face + 1):
                angle = math.pi / 2 + j * 2 * math.pi / 3
                offset = side * (math.cos(angle) * radius) + Vector((0, -math.sin(angle) * radius, 0))
                vertices.append((h * x / 2 + offset.x, offset.y, z + offset.z))
            if i < count:
                a = face * (count + 1) * 2 + i * 2
                faces.append((a, a + 1, a + 3, a + 2))
                uvs.append(((0, i/count), (1, i/count), (1, (i+1)/count), (0, (i+1)/count)))
    geometry = bpy.data.meshes.new('Gateway_Arch_Triangular_Steel')
    geometry.from_pydata(vertices, [], faces)
    geometry.update()
    uv = geometry.uv_layers.new(name='Brushed_Steel_UV')
    for polygon, coordinates in zip(geometry.polygons, uvs):
        polygon.use_smooth = True
        for loop_index, coordinate in zip(polygon.loop_indices, coordinates):
            uv.data[loop_index].uv = coordinate
    arch = bpy.data.objects.new('Gateway_Arch', geometry)
    scene.collection.objects.link(arch)
    arch['proportions'] = 'H=40; span=40; triangular side at base=0.0857H, apex=0.027H'
    arch['geometry'] = 'Original tapered triangular sweep along an inverted catenary; no circular tube'
    material = bpy.data.materials.new('Brushed_Stainless_Steel')
    material.use_nodes = True
    tree = material.node_tree
    principled = tree.nodes.get('Principled BSDF')
    principled.inputs['Base Color'].default_value = (0.64, 0.7, 0.78, 1)
    principled.inputs['Metallic'].default_value = 1
    principled.inputs['Roughness'].default_value = 0.23
    principled.inputs['Anisotropic'].default_value = 0.55
    coord = node(tree, 'ShaderNodeTexCoord')
    grain_coords = vector_node(tree, 'MULTIPLY', coord.outputs['UV'], (240, 5, 1))
    noise = node(tree, 'ShaderNodeTexNoise', 'Subtle brushed steel grain')
    noise.inputs['Scale'].default_value = 5
    noise.inputs['Detail'].default_value = 2
    tree.links.new(grain_coords, noise.inputs['Vector'])
    roughness = math_node(tree, 'ADD', math_node(tree, 'MULTIPLY', noise.outputs['Fac'], 0.08), 0.19)
    tree.links.new(roughness, principled.inputs['Roughness'])
    bump = node(tree, 'ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.1
    bump.inputs['Distance'].default_value = 0.002
    tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    tree.links.new(bump.outputs['Normal'], principled.inputs['Normal'])
    arch.data.materials.append(material)
    world = scene.world.node_tree
    sky = node(world, 'ShaderNodeTexSky', 'Blue hour reflection environment')
    sky.sky_type = 'MULTIPLE_SCATTERING'
    sky.sun_elevation = math.radians(8)
    sky.sun_rotation = math.radians(135)
    sky.sun_size = math.radians(3)
    sky.sun_intensity = 0.3
    sky.air_density = 1.2
    sky.aerosol_density = 2
    world.links.new(sky.outputs['Color'], world.nodes['Background'].inputs['Color'])
    world.nodes['Background'].inputs['Strength'].default_value = 0.22
    area(scene, 'Softbox_Silver_Key', (-20, -40, 50), 18000, 32, (0.73, 0.85, 1), (0, 0, 22), 45)
    area(scene, 'Warm_Horizon_Reflection', (35, -12, 22), 13000, 12, (1, 0.76, 0.54), (0, 0, 18), 50)
    area(scene, 'Blue_Edge_Reflection', (-32, 15, 35), 24000, 14, (0.33, 0.53, 1), (0, 0, 25), 40)
    area(scene, 'Top_Strip', (2, -5, 70), 11000, 28, (0.92, 0.96, 1), (0, 0, 25), 8)
    scene.camera.location = (18, -120, 23)
    scene.camera.data.ortho_scale = 53
    aim(scene.camera, (0, 0, 20))
    return scene


def create_clouds(samples=128, width=2048, height=1024):
    scene = setup_scene('Portfolio_Cloud_Bank', width, height, samples)
    scene.cycles.volume_step_rate = 2
    scene.cycles.volume_max_steps = 256
    vertices = [(x, y, z) for x in (-60, 60) for y in (-18, 18) for z in (-14, 20)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    geometry = bpy.data.meshes.new('Cloud_Volume_Bounds')
    geometry.from_pydata(vertices, [], faces)
    geometry.update()
    cloud = bpy.data.objects.new('Cumulus_Cloud_Bank', geometry)
    scene.collection.objects.link(cloud)
    material = bpy.data.materials.new('Cumulus_Multiple_Scattering')
    material.use_nodes = True
    tree = material.node_tree
    tree.nodes.clear()
    output = node(tree, 'ShaderNodeOutputMaterial')
    volume = node(tree, 'ShaderNodeVolumePrincipled')
    volume.inputs['Color'].default_value = (0.79, 0.86, 1, 1)
    volume.inputs['Anisotropy'].default_value = 0.35
    tree.links.new(volume.outputs['Volume'], output.inputs['Volume'])
    position = node(tree, 'ShaderNodeTexCoord').outputs['Object']
    lobes = [(-39, 2, -3, 14, 9, 6), (-27, 1, 0, 14, 10, 8), (-12, 2, -2, 17, 10, 7),
             (2, 3, 1, 16, 10, 10), (19, 0, -2, 17, 9, 7), (35, 3, -3, 14, 9, 6),
             (-22, -5, -4, 12, 9, 5), (-2, -6, -4, 15, 8, 5), (23, -5, -5, 14, 8, 5),
             (-4, 4, 7, 8, 7, 8), (11, 2, 6, 8, 7, 7), (-27, 4, 4, 7, 7, 7)]
    field = -10.0
    for x, y, z, rx, ry, rz in lobes:
        offset = vector_node(tree, 'SUBTRACT', position, (x, y, z))
        scaled = vector_node(tree, 'MULTIPLY', offset, (1/rx, 1/ry, 1/rz))
        length = node(tree, 'ShaderNodeVectorMath')
        length.operation = 'LENGTH'
        tree.links.new(scaled, length.inputs[0])
        field = math_node(tree, 'MAXIMUM', field, math_node(tree, 'SUBTRACT', 1, length.outputs['Value']))
    noise = node(tree, 'ShaderNodeTexNoise', 'Turbulent cloud billows')
    noise.inputs['Scale'].default_value = 0.45
    noise.inputs['Detail'].default_value = 4
    noise.inputs['Roughness'].default_value = 0.7
    noise.inputs['Distortion'].default_value = 0.2
    tree.links.new(position, noise.inputs['Vector'])
    turbulence = math_node(tree, 'MULTIPLY', math_node(tree, 'SUBTRACT', noise.outputs['Fac'], 0.5), 0.9)
    density = math_node(tree, 'MULTIPLY', math_node(tree, 'POWER', math_node(tree, 'MAXIMUM', math_node(tree, 'ADD', field, turbulence), 0), 1.5), 0.65)
    tree.links.new(density, volume.inputs['Density'])
    cloud.data.materials.append(material)
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.12, 0.18, 0.32, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.32
    light = bpy.data.lights.new('Cloud_Sun', 'SUN')
    light.energy = 3
    light.angle = math.radians(15)
    light.color = (0.72, 0.83, 1)
    sun = bpy.data.objects.new('Cloud_Sun', light)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(20), math.radians(-30), math.radians(-35))
    area(scene, 'Cloud_Warm_Edge', (15, 22, 28), 28000, 55, (1, 0.66, 0.4), (0, 0, 0), 25)
    scene.camera.location = (0, -110, 30)
    scene.camera.data.ortho_scale = 119
    aim(scene.camera, (0, 0, 0))
    return scene


def build(directory):
    if not bpy.app.background:
        raise RuntimeError("Run this exporter in a separate background Blender process, not an interactive session.")
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    arch, clouds = create_arch(), create_clouds()
    bpy.context.window.scene = arch
    bpy.ops.wm.save_as_mainfile(filepath=str(directory / 'arch-clouds.blend'), compress=True)
    return arch, clouds


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=Path(__file__).parent)
    parser.add_argument('--preview', action='store_true')
    parser.add_argument('--only', choices=['arch', 'clouds', 'all'], default='all')
    import sys
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    scenes = build(args.output)
    for name, scene in zip(('arch', 'clouds'), scenes):
        if args.only not in (name, 'all'):
            continue
        if args.preview:
            scene.render.resolution_percentage = 50
            scene.cycles.samples = 32
        scene.render.filepath = str(args.output / (name + ('-preview' if args.preview else '') + '.png'))
        bpy.ops.render.render(write_still=True, scene=scene.name)
