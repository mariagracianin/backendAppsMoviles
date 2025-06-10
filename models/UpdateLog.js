// models/UpdateLog.js
const mongoose = require('mongoose');

const updateLogSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  date: { type: Date, required: true },
  userCount: { type: Number, required: true },
  groupCount: { type: Number, required: true }
});

module.exports = mongoose.model('UpdateLog', updateLogSchema);
