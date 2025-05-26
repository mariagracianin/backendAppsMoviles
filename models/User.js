const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  user_mail: {
    type: String,
    required: true
  },
  name: String,
  score: {
    type: Number,
    default: 0
  },
  icon: String,
  color: String,
  frecuencia: String
}, { _id: false }); // evita crear un _id interno para cada habit

const postSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  user_mail: {
    type: String,
    required: true
  },
  photo: String,
  validated: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  },
  aproveal_qty: {
    type: Number,
    default: 0
  },
  rejected_qty: {
    type: Number,
    default: 0
  },
  habit_id: String
}, { _id: false }); // evita crear un _id interno para cada post

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
  name: String,
  photo: String,
  habits: [habitSchema],
  posts: [postSchema],
  groups_ids: {
        type: [String], // lista de ids de grupos
    }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
