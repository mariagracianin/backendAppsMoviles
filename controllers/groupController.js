const User = require('../models/User');
const Group = require('../models/Group');
const mongoose = require('mongoose');
const { getHabitsInGroupFromUserInternal } = require('./userController.js'); 

const createGroup = async (req, res) => {
  try {
    const { userId, ...groupData } = req.body;

    // 1. Crear el grupo
    const newGroup = new Group(groupData);
    const savedGroup = await newGroup.save();

    // 2. Agregar el grupo al usuario
    const User = require('../models/User'); // Asegurate de tener esta importación al comienzo si no está
    await User.findByIdAndUpdate(
      userId,
      { $push: { id_groups: savedGroup._id } },
      { new: true }
    );

    res.status(201).json(savedGroup);
  } catch (err) {
    console.error('Error al crear el grupo:', err);
    res.status(500).json({ error: 'Error al crear el grupo' });
  }
};



const editGroup = async (req, res) => {
  try {
    const newGroup = new Group(req.body);
    const saved = await newGroup.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error al guardar el grupo:', err);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
};

const isValidGroupId = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    console.log('ID no válido como ObjectId');
    return false;
  }

  const exists = await Group.exists({ _id: id });
  return !!exists;
};


const getUsersFromGroup = async (req, res) => {
  const { groupId } = req.params;
  try {
    const isValid = await isValidGroupId(groupId);
    if (!isValid) throw new Error('El id del grupo no es válido o no existe');

    const users = await User.find({ id_groups: groupId }).select('username photo habits'); //solo trae estos datos
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//funcion interna reutilizable
const getUsersFromGroupInternal = async (groupId) => {
  const isValid = await isValidGroupId(groupId);
  if (!isValid) throw new Error('El id del grupo no es válido o no existe');

  return await User.find({ id_groups: groupId }).select('username photo habits'); //solo trae estos datos
};


//Trae todos los habitos de un grupo de la manera usuario + [habitos] (entero/obj) 
//(usa la funcion getUsersFromGroup + getHabitsInGroupFromUser)
const getHabitsFromGroup = async (req, res) => {
  const { groupId } = req.params;

  try {
    const users = await getUsersFromGroupInternal(groupId);

    const result = await Promise.all(users.map(async (user) => {
      const habits = await getHabitsInGroupFromUserInternal(user._id, groupId);

      return {
        username: user.username,
        photo: user.photo,
        habits: habits.map(h => ({
          name: h.name,
          icon: h.icon,
          frequency: h.frequency,
          weekly_counter: h.weekly_counter
        }))
      };
    }));

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


module.exports = {
  createGroup,
  editGroup,
  getUsersFromGroup,
  getHabitsFromGroup
};