const User = require('../models/User');
const Group = require('../models/Group');
const mongoose = require('mongoose');
const { getHabitsInGroupFromUserInternal } = require('./userController.js');
const getImageAsBase64 = require('../utils/getImageFromS3base64.js/index.js');


// Verifica si un usuario pertenece a un grupo
const userBelongsToGroup = async (userId, groupId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) return false;

  const user = await User.findById(userId);
  if (!user) return false;

  return user.id_groups.some(gId => gId.toString() === groupId.toString());
};

// Crear grupo: el creador se agrega automáticamente
const createGroup = async (req, res) => {
  try {
    const userId = req.userId;
    const groupData = req.body;

    const newGroup = new Group(groupData);
    const savedGroup = await newGroup.save();

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

const deleteGroup = async (req, res) => {
  try {
    const userId = req.userId;
    const { groupId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: 'ID de grupo no válido' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const user = await User.findById(userId);
    if (!user || !user.id_groups.includes(groupId)) {
      return res.status(403).json({ error: 'No estás autorizado para eliminar este grupo' });
    }

    // 1. Eliminar el grupo
    await Group.findByIdAndDelete(groupId);

    // 2. Quitar el grupo de id_groups y id_pending_groups de todos los usuarios
    await User.updateMany(
      {},
      {
        $pull: {
          id_groups: groupId,
          id_pending_groups: groupId,
          'habits.$[].id_groups': groupId
        }
      }
    );

    res.status(200).json({ message: 'Grupo eliminado y referencias limpiadas correctamente' });
  } catch (err) {
    console.error('Error al eliminar grupo:', err);
    res.status(500).json({ error: 'Error al eliminar grupo y limpiar referencias' });
  }
};


// Editar grupo solo si el usuario pertenece
const editGroup = async (req, res) => {
  try {
    const userId = req.userId;
    const { _id, name, color, pet_name } = req.body;

    if (!_id || !name) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    const allowed = await userBelongsToGroup(userId, _id);
    if (!allowed) {
      return res.status(403).json({ message: 'No tienes permiso para editar este grupo.' });
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
  return id && mongoose.Types.ObjectId.isValid(id) && await Group.exists({ _id: id });
};

const getUsersFromGroup = async (req, res) => {
  const { groupId } = req.params;

  try {
    const isValid = await isValidGroupId(groupId);
    if (!isValid) throw new Error('El id del grupo no es válido o no existe');

    // Traer solo campos necesarios
    const users = await User.find({ id_groups: groupId }).select('username photo');

    // Agregar base64 si tienen foto
    const usersWithBase64 = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();

        if (userObj.photo) {
          userObj.photoBase64 = await getImageAsBase64(userObj.photo);
        }

        return userObj;
      })
    );

    res.json(usersWithBase64);
  } catch (error) {
    console.error('Error en getUsersFromGroup:', error);
    res.status(400).json({ error: error.message });
  }
};



const getUsersFromGroupInternal = async (groupId) => {
  const isValid = await isValidGroupId(groupId);
  if (!isValid) throw new Error('El id del grupo no es válido o no existe');

  return await User.find({ id_groups: groupId }).select('username photo habits');
};

// Devuelve los hábitos de los usuarios del grupo
const getHabitsFromGroup = async (req, res) => {
  const { groupId } = req.params;
  try {
    const allowed = await userBelongsToGroup(req.userId, groupId);
    if (!allowed) {
      return res.status(403).json({ message: 'No tienes permiso para ver los hábitos de este grupo.' });
    }

    const users = await getUsersFromGroupInternal(groupId);

    const result = await Promise.all(users.map(async (user) => {
      const habits = await getHabitsInGroupFromUserInternal(user._id, groupId);

      let photoBase64 = null;
      if (user.photo) {
        try {
          photoBase64 = await getImageAsBase64(user.photo);
        } catch (err) {
          console.warn(`No se pudo convertir la imagen para el usuario ${user.username}:`, err.message);
        }
      }

      return {
        username: user.username,
        photo: user.photo,
        photoInBase64: photoBase64,
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

// Devuelve el ranking de usuarios por score en ese grupo
const getGroupRanking = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    const allowed = await userBelongsToGroup(userId, groupId);
    if (!allowed) {
      return res.status(403).json({ message: 'No tienes permiso para ver este ranking.' });
    }

    const users = await User.find({ id_groups: groupId });


    const scores = await Promise.all(users.map(async (user) => {
      const groupHabits = user.habits.filter(habit =>
        habit.id_groups && habit.id_groups.includes(groupId)
      );

      if (groupHabits.length === 0) return null;

      const totalScore = groupHabits.reduce((sum, habit) => sum + habit.score, 0);
      const averageScore = totalScore / groupHabits.length;

      let photoBase64 = null;
      if (user.photo) {
        try {
          photoBase64 = await getImageAsBase64(user.photo);
        } catch (err) {
          console.warn(`No se pudo convertir la imagen de ${user.username}:`, err.message);
        }
      }

      return {
        username: user.username,
        photo: user.photo,
        photoInBase64: photoBase64, 
        score: averageScore
      };
    }));

    const sortedScores = scores.filter(Boolean).sort((a, b) => b.score - a.score);
    res.status(200).json(sortedScores);
  } catch (error) {
    console.error('Error al obtener el ranking:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GetGroup
const getGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    const allowed = await userBelongsToGroup(userId, groupId);
    if (!allowed) {
      return res.status(403).json({ message: 'No tienes permiso para ver este grupo.' });
    }

    const group = await Group.findById(groupId).select('name color pet_name');
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    const users = await User.find({ id_groups: groupId }).select('mail username');

    const members = users.map(user => ({
      mail: user.mail,
      username: user.username
    }));

    res.status(200).json({
      name: group.name,
      color: group.color,
      pet_name: group.pet_name,
      members
    });
  } catch (error) {
    console.error('Error al obtener datos del grupo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};


module.exports = {
  createGroup,
  editGroup,
  getUsersFromGroup,
  getHabitsFromGroup,
  getGroupRanking,
  getGroup,
  deleteGroup
};
