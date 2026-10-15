"""Denoise a linear Cycles EXR with normal/albedo guides, then apply AgX."""
import argparse, os, pathlib, subprocess
import numpy as np
import OpenEXR
import PyOpenColorIO as ocio
from PIL import Image, ImageFilter


def write_pfm(path, data):
    data = np.asarray(data, dtype=np.float32)
    with open(path, 'wb') as handle:
        handle.write(f'PF\n{data.shape[1]} {data.shape[0]}\n-1.0\n'.encode())
        np.flipud(data[..., :3]).astype('<f4').tofile(handle)


def read_pfm(path):
    with open(path, 'rb') as handle:
        assert handle.readline().strip() == b'PF'
        width, height = map(int, handle.readline().split())
        handle.readline()
        return np.flipud(np.fromfile(handle, '<f4').reshape(height, width, 3)).copy()


def grade(src, dst, tool, config, exposure=0.0):
    channels = OpenEXR.File(str(src)).channels()
    prefix = 'ViewLayer.'
    color = channels[prefix + 'Combined'].pixels[..., :3].astype(np.float32)
    albedo = channels[prefix + 'DiffCol'].pixels[..., :3].astype(np.float32)
    normal = np.stack([channels[prefix + 'Normal.' + axis].pixels for axis in 'XYZ'], axis=-1).astype(np.float32)
    work = pathlib.Path(src).parent
    for name, data in [('color', color), ('albedo', albedo), ('normal', normal)]:
        write_pfm(work / (name + '.pfm'), data)
    output = work / 'denoised.pfm'
    subprocess.run([str(tool), '--device', 'cpu', '--hdr', str(work / 'color.pfm'), '--alb', str(work / 'albedo.pfm'), '--nrm', str(work / 'normal.pfm'), '-o', str(output), '--threads', '4', '--verbose', '0'], check=True, stdout=subprocess.DEVNULL)
    image = read_pfm(output) * (2 ** exposure)
    depth_channel = channels.get(prefix + 'Depth.Z')
    if depth_channel is not None:
        depth = np.nan_to_num(depth_channel.pixels.astype(np.float32), nan=50, posinf=50)
        # Depth-composited aerial haze, distinct from the path-traced lighting.
        haze = np.minimum(.24, 1 - np.exp(-.018 * np.maximum(0, depth - 4)))[..., None]
        image = image * (1 - haze) + np.array([.008, .014, .024], dtype=np.float32) * haze
    cfg = ocio.Config.CreateFromFile(str(config))
    pipeline = ocio.GroupTransform()
    pipeline.appendTransform(ocio.LookTransform(src='Linear Rec.709', dst='Linear Rec.709', looks='AgX - Medium High Contrast'))
    pipeline.appendTransform(ocio.DisplayViewTransform(src='Linear Rec.709', display='sRGB', view='AgX'))
    cfg.getProcessor(pipeline).getDefaultCPUProcessor().applyRGB(image)
    image = np.clip(image, 0, 1)
    highlights = np.uint8(np.clip((image - .8) / .2, 0, 1) * 255)
    bloom = np.asarray(Image.fromarray(highlights).filter(ImageFilter.GaussianBlur(8)), dtype=np.float32) / 255
    image = np.clip(image + bloom * .045, 0, 1)
    Image.fromarray(np.uint8(image * 255)).save(dst, quality=95)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('src'); parser.add_argument('dst')
    parser.add_argument('--oidn', default=os.environ.get('OIDN_BIN', 'oidnDenoise'))
    parser.add_argument('--ocio', default='/usr/share/blender/datafiles/colormanagement/config.ocio')
    parser.add_argument('--exposure', type=float, default=0.0)
    args = parser.parse_args()
    grade(args.src, args.dst, args.oidn, args.ocio, args.exposure)
