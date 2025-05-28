const User = require('../models/User');
const Group = require('../models/Group');

const createUser = async (req, res) => {
  try {
    const newUser = new User(req.body);
    const saved = await newUser.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error al guardar el usuario:', err);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
};

module.exports = {
  createUser
};
