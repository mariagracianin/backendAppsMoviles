const User = require('../models/User');
const Group = require('../models/Group');
const mongoose = require('mongoose');


// getUsersFromGroup
// getHabitsFromGroup -> Trae todos los habitos de un grupo de la manera usuario + [habitos] (entero/obj) (usa la funcion getUsersFromGroup + getHabitsInGroupFromUser)

const createGroup = async (req, res) => {
  try {
    const newGroup = new Group(req.body);
    const saved = await newGroup.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error al guardar el grupo:', err);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
};

module.exports = {
  createGroup
};