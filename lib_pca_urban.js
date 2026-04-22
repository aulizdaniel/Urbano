// ============================================================
// lib_pca_urban.js
// Librería para calcular PC1 de índices urbanos en GEE
// Uso: var lib = require('users/TU_USUARIO/TU_REPO:lib_pca_urban')
//      var mosaic_pc1 = lib.addPC1Urban(image, geometry)
// ============================================================

/**
 * Añade el PC1 de índices urbanos (NDBI, UI, NDUI, EBBI) como banda
 * a una imagen de entrada.
 *
 * @param {ee.Image}    image    - Imagen con bandas NDBI, UI, NDUI, EBBI
 * @param {ee.Geometry} geometry - Geometría para calcular la covarianza
 * @returns {ee.Image} Imagen original con banda 'PC1' añadida
 */
exports.addPC1Urban = function(image, geometry) {
  var urban_bands = ['NDBI', 'UI', 'NDUI', 'EBBI'];

  // 1. Seleccionar bandas relevantes
  var img_urban = image.select(urban_bands);

  // 2. Calcular medias y centrar la imagen
  var means = img_urban.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geometry,
    scale: 30,
    maxPixels: 1e9,
    tileScale: 4
  });
  var centered = img_urban.subtract(means.toImage(urban_bands));

  // 3. Calcular matriz de covarianza
  var covMatrix = ee.Array(
    centered.toArray()
      .reduceRegion({
        reducer: ee.Reducer.covariance(),
        geometry: geometry,
        scale: 30,
        maxPixels: 1e9,
        tileScale: 4
      }).get('array')
  );

  // 4. Eigendecomposition → PC1
  var eigen   = covMatrix.eigen();
  var pc1_vec = eigen.slice(1, 1).slice(0, 0, 1); // shape [1x4]

  // 5. Proyectar: multiplicar cada banda centrada por su peso y sumar
  var weights   = ee.Image.constant(pc1_vec.reshape([4]).toList())
                    .rename(urban_bands);
  var pc1_image = centered
                    .multiply(weights)
                    .reduce(ee.Reducer.sum())
                    .rename('PC1');

  return image.addBands(pc1_image);
};