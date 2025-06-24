// utils/uploadImageToS3.js
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const s3 = require('../config/s3');

const uploadImageToS3 = async (file) => {
  const ext = path.extname(file.originalname); // .jpg, .png
  const key = `imagenes/${uuidv4()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private', 
  });

  await s3.send(command);

  return key; 
};

module.exports = uploadImageToS3;
