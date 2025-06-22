// config/s3.js
const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

console.log('[S3 CONFIG] AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID?.slice(0, 4) || 'MISSING');
console.log('[S3 CONFIG] AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'OK' : 'MISSING');
console.log('[S3 CONFIG] AWS_REGION:', process.env.AWS_REGION || 'MISSING');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

module.exports = s3;