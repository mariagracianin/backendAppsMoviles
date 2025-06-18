// utils/uploadImageToS3.js
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const s3 = require('../config/s3');
require('dotenv').config();

async function uploadImageToS3(file) {
  const filename = `imagenes/${uuidv4()}-${file.originalname}`;
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: filename,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  });

  await s3.send(command);

  return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
}

module.exports = uploadImageToS3;
