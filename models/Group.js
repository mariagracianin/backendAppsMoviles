const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        default: 0
    },
    photo: {
        type: String 
    },
    pet_name: {
        type: String
    },
    pet_status: {
        type: String,
        default: "Sad" //happy, sad, super happy
    }
}, {
  timestamps: true // agrega createdAt y updatedAt automáticamente
});

module.exports = mongoose.model('Group', groupSchema);
