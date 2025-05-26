// models/Item.js
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  creado: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', ItemSchema);
