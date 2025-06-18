// middlewares/upload.js
const multer = require('multer');

const storage = multer.memoryStorage(); // guarda el archivo en RAM
const upload = multer({ storage });

module.exports = upload;
