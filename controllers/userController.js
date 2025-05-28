const User = require('../models/User');
const Group = require('../models/Group');


// getGroupsUser
// getInvitesUser
// getHabitsInGroupFromUser     -> trae los habitos que tiene en un grupo X una persona Y
// getUsersWithGroupsInCommon   -> trae todos los usauarios que tienen un grupo o mas en comun con persona Y
//


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
