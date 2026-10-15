import { mkdir } from 'node:fs/promises'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco from 'draco3dgltf'
await mkdir('.cinema-cache', { recursive: true })
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco.createDecoderModule() })
const document = await io.read('public/models/ferrari.glb')
for (const extension of document.getRoot().listExtensionsUsed()) {
  if (extension.extensionName === 'KHR_draco_mesh_compression') extension.dispose()
}
await io.write('.cinema-cache/car.glb', document)
console.log('Prepared uncompressed cinema asset; original GLB is unchanged.')
