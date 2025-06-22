// utils/deleteImageFromS3.js
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../config/s3');

/**
 * Borra una imagen del bucket S3 a partir del path interno (ej: "imagenes/xxx.jpg").
 * @param {string} key - Ruta del archivo dentro del bucket (sin el dominio)
 * @returns {Promise<void>}
 */
async function deleteFromS3(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key
    });

    await s3.send(command);
    console.log(`Imagen eliminada de S3: ${key}`);
  } catch (error) {
    console.error(`Error al eliminar imagen de S3 (${key}):`, error);
    throw error;
  }
}

module.exports = deleteFromS3;
