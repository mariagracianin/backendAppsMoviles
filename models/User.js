const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const postSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  photo: {
    type: String,
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

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
  posts: [postSchema], // lista de post embebidos
  post_dates: [{
    type: Date
  }],
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
  coins: {
    type: Number,
    default: 0
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

// Método para comparar contraseñas
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
