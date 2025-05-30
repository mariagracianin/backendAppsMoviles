const User = require('../models/User');
const Group = require('../models/Group');
const mongoose = require('mongoose');

// loginUser

// getHabitsInGroupFromUser     -> trae los habitos que tiene en un grupo X una persona Y
// getUsersWithGroupsInCommon   -> trae todos los usauarios que tienen un grupo o mas en comun con persona Y

//crear un nuevo usuario
const createUser = async (req, res) => {
  try {
    const newUser = new User(req.body);
    const saved = await newUser.save();
    res.status(201).json({ id: saved._id, user: saved }); //devuelve el ID de mongo
  } catch (err) {
    if (err.code === 11000) {
      // Error de duplicado
      const duplicatedField = Object.keys(err.keyValue)[0];
      return res.status(400).json({ error: `${duplicatedField} ya está en uso.` }); //error si se repiten las primary keys
    }
    console.error('Error al guardar el usuario:', err);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
};

//funcion interna que devuelve el objeto usuario a partir de su ID
const fetchUserById = async (id) => {
  if (!id) throw new Error('Falta el id del usuario');
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('El id no es válido');

  const user = await User.findById(id);
  if (!user) throw new Error('Usuario no encontrado');

  return user;
};

//devuelve todos los datos del usuario. Hay que pasarle el id de mongo en este formato http://localhost:3000/user/6839fc99705dbc0534b703f2
const getUser = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await fetchUserById(id);
    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(400).json({ error: error.message });
  }
};

//funcion que devuelve los grupos de un usuario
const getUserGroups = async (req, res) => {
  try {
    const user = await fetchUserById(req.params.id);
    res.json({ id_groups: user.id_groups });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//funcion que devuelve las invitaciones de un usuario
const getUserPendingGroups = async (req, res) => {
  try {
    const user = await fetchUserById(req.params.id);
    res.json({ id_pending_groups: user.id_pending_groups });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//editar usuario existente. Hay que pasarle el _id de mongo y los campos que se quieran editar. 
//sirve para poder agregar valores a los atributos del usuario. Por ejemplo agregar grupos.
const editUser = async (req, res) => {
  try {
    const { _id, ...updates } = req.body;

    if (!_id) {
      return res.status(400).json({ error: 'El _id es obligatorio para editar el usuario' });
    }

    const updatedUser = await User.findByIdAndUpdate(_id, updates, { new: true, runValidators: true });

    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json(updatedUser);

  } catch (error) {
    if (error.code === 11000) {
      const duplicatedField = Object.keys(error.keyValue)[0];
      return res.status(400).json({ error: `${duplicatedField} ya está en uso.` });
    }
    console.error('Error al editar usuario:', error);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
};

//crear un habito nuevo para un usuario, fijandose si ya existe un hábito con ese nombre
const createHabitUser = async (req, res) => {
  try {
    const { userId, habit } = req.body;

    if (!userId || !habit) {
      return res.status(400).json({ error: 'Faltan datos requeridos: userId o habit' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'El userId no es válido' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si ya existe un hábito con el mismo nombre
    const habitNameExists = user.habits.some(h => h.name === habit.name);
    if (habitNameExists) {
      return res.status(400).json({ error: `Ya existe un hábito con el nombre ${habit.name}. Elegí otro nombre.` });
    }

    // Agregar el nuevo hábito
    const updatedHabits = [...user.habits, habit];

    // Reutilizar la función editUser pasando un request simulado
    req.body = {
      _id: userId,
      habits: updatedHabits
    };

    // Llamar a editUser y pasarle el req y res original
    await editUser(req, res);

  } catch (error) {
    console.error('Error al agregar hábito:', error);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
};

//funcion para editar un habito, capaz no tiene mucho sentido usarla
const editHabitUser = async (userId, habitName, updates) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('El userId no es válido');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const habit = user.habits.find(h => h.name === habitName);
  if (!habit) {
    throw new Error(`Hábito "${habitName}" no encontrado en el usuario.`);
  }

  // Si updates incluye newGroupId, agregamos ese grupo sin duplicados
  if (updates.newGroupId) {
    const groupIdStr = updates.newGroupId.toString();
    const currentGroups = habit.id_groups.map(g => g.toString());
    if (!currentGroups.includes(groupIdStr)) {
      habit.id_groups.push(updates.newGroupId);
    }
    delete updates.newGroupId; // para no sobreescribir abajo
  }

  // Actualizar otros campos que vengan en updates
  Object.entries(updates).forEach(([key, value]) => {
    habit[key] = value;
  });

  await user.save();

  return habit;
};


//funcion para marcar que se completo un habito con una foto
//Todo: falta agregar el funcionamiento del score
const loadHabitUser = async (req, res) => {
  try {
    const { userId, habitName, post_photo } = req.body;

    if (!userId || !habitName || !post_photo) {
      return res.status(400).json({ error: 'Faltan datos requeridos: userId, habitName o post_photo' });
    }

    // Fecha actual y cálculo del índice del día (Lunes=0 ... Domingo=6)
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7;

    // Preparamos las actualizaciones
    const updates = {
      post_photo,
      post_date: now,
      // Para weekly_counter, necesitamos actualizar el índice correcto en el array actual
      // Así que debemos obtener el hábito actual primero, para copiar y modificar weekly_counter
    };

    // Primero obtenemos el usuario para obtener el hábito y actualizar weekly_counter
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const habit = user.habits.find(h => h.name === habitName);
    if (!habit) {
      return res.status(404).json({ error: `Hábito "${habitName}" no encontrado en el usuario.` });
    }

    // Copiar weekly_counter y actualizar el día correspondiente
    const newWeeklyCounter = [...habit.weekly_counter];
    newWeeklyCounter[dayIndex] = 1;

    updates.weekly_counter = newWeeklyCounter;

    // Usamos editHabitUser para actualizar
    const updatedHabit = await editHabitUser(userId, habitName, updates);

    res.status(200).json({ message: 'Hábito actualizado correctamente', habit: updatedHabit });

  } catch (error) {
    console.error('Error al cargar hábito del usuario:', error);
    // Aquí el error puede venir de editHabitUser o validaciones
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error en la base de datos' });
  }
};

//funcion para agregar un grupo a un habito. 
//FALTA HACER UN CHEQUEO DE QUE EL GRUPO EXISTA
const addGroupToHabit = async (req, res) => {
  try {
    const { userId, habitName, newGroupId } = req.body;

    if (!userId || !habitName || !newGroupId) {
      return res.status(400).json({ error: 'Faltan datos requeridos: userId, habitName o newGroupId' });
    }

    const updatedHabit = await editHabitUser(userId, habitName, { newGroupId });

    res.status(200).json({ message: 'Grupo agregado correctamente al hábito', habit: updatedHabit });
  } catch (error) {
    console.error('Error al agregar grupo al hábito:', error);
    res.status(400).json({ error: error.message || 'Error en la base de datos' });
  }
};

module.exports = {
  createUser,
  getUser,
  editUser,
  createHabitUser,
  loadHabitUser,
  addGroupToHabit,
  getUserGroups,
  getUserPendingGroups
};
