const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
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
        enum: ['status1', 'status2', 'status3', 'status4'], // ejemplo
        default: 'status1'
    },
    user_emails: {
        type: [String], // lista de mails de usuarios
    },
    habits_ids: {
        type: [String], // lista de habitos o ids de habitos?
    }
}, {
  timestamps: true // agrega createdAt y updatedAt automáticamente
});

module.exports = mongoose.model('Group', groupSchema);


//FALTA DEFINIR COMO ASOCIAL HABITO A GRUPO
