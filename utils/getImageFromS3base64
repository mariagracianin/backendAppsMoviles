// utils/getImageAsBase64.js
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { Buffer } = require('buffer');
const s3 = require('../config/s3');

const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

/**
 * Devuelve la imagen de S3 codificada en base64 con prefijo data:image/jpeg;base64,...
 * @param {string} key - Ruta del archivo en el bucket S3 (por ejemplo: 'imagenes/xxx.jpg')
 * @returns {string} - Cadena en formato data URI (image/jpeg;base64,...)
 */
const getImageAsBase64 = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  const response = await s3.send(command);
  const buffer = await streamToBuffer(response.Body);
  const base64 = buffer.toString('base64');

  const contentType = response.ContentType || 'image/jpeg';
  return `data:${contentType};base64,${base64}`;
};

module.exports = getImageAsBase64;
