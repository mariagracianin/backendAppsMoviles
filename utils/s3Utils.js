const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION });

const getImageFromS3 = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  const response = await s3.send(command);
  return response.Body; // stream
};

module.exports = { getImageFromS3 };
