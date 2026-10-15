const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/CartaYta_1.json'),
      require('../image-targets/CartaYta_2.json'),
      require('../image-targets/CartaYta_3.json'),
      require('../image-targets/CartaYta_4.json'),
      require('../image-targets/CartaYta_5.json'),
      require('../image-targets/CartaYta_6.json'),
      require('../image-targets/CartaYta_7.json')
    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)

