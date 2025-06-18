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
    const { _id, name, color, pet_name } = req.body;

    if (!_id) {
      return res.status(400).json({ message: 'El ID del grupo es obligatorio.' });
    }

    if (!name) {
      return res.status(400).json({ message: 'El nombre del grupo es obligatorio.' });
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      _id,
      { name, color, pet_name },
      { new: true, runValidators: true }
    );

    if (!updatedGroup) {
      return res.status(404).json({ message: 'Grupo no encontrado.' });
    }

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error('Error al editar el grupo:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
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


const getGroupRanking = async (req, res) => {
  const { groupId } = req.params;

  try {
    // Traer solo los usuarios que pertenecen al grupo
    const users = await User.find({ id_groups: groupId });

    const scores = users.map(user => {
      // Filtrar hábitos que pertenecen al grupo
      const groupHabits = user.habits.filter(habit =>
        habit.id_groups && habit.id_groups.includes(groupId)
      );

      if (groupHabits.length === 0) return null;

      // Calcular promedio de scores
      const totalScore = groupHabits.reduce((sum, habit) => sum + habit.score, 0);
      const averageScore = totalScore / groupHabits.length;

      return {
        username: user.username,
        photo: user.photo,
        score: averageScore
      };
    });

    // Filtrar usuarios sin hábitos del grupo y ordenar
    const sortedScores = scores
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    res.status(200).json(sortedScores);
  } catch (error) {
    console.error('Error getting group scores:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createGroup,
  editGroup,
  getUsersFromGroup,
  getHabitsFromGroup,
  getGroupRanking
};