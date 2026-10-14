const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/CartaYta_1.json'),
      require('../image-targets/CartaYta_2.json'),
      require('../image-targets/imagetarget.json')
    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)

