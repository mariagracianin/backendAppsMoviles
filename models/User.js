const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  icon: {
    type: String
  },
  color: {
    type: String
  },
  frequency: {
    type: Number // del 1 al 7
  },
  post_photo: {
    type: String
  },
  post_date: {
    type: Date
  },
  id_groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  weekly_counter: {
    type: [Number],
    default: [0, 0, 0, 0, 0, 0, 0], // Lunes a Domingo
  }
});

const userSchema = new mongoose.Schema({
  mail: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  photo: {
    type: String
  },
  habits: [habitSchema], // lista de hábitos embebidos
  id_groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  id_pending_groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }]
});

module.exports = mongoose.model('User', userSchema);
