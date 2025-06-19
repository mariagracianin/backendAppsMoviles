const User = require('../models/User');
const Group = require('../models/Group');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const uploadImageToS3 = require('../utils/uploadImageToS3');

//Login usuario
const loginUser = async (req, res) => {
  const { mail, password } = req.body;

  // 1. Buscar el usuario
  const user = await User.findOne({ mail });
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // 2. Verificar contraseña
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // 3. Crear y devolver token JWT
  const token = jwt.sign({ userId: user._id }, 'roxi_joaqui_clave_secreta', { expiresIn: '2h' });

  // 4. Enviar respuesta
  res.json({
    message: 'Login exitoso',
    token,
    userId: user._id
  });
};
// con lo de valid user se puede usar para el resto de las funciones tambien que le pasas un get pero no entinedo si es necesario o no, en alguna funcion abajo hice un comentario de esto


//crear un nuevo usuario NUEVO
const createUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;

    // Hashear la contraseña
    const hash = await bcrypt.hash(password, 10);

    // Crear el nuevo usuario con la contraseña hasheada
    const newUser = new User({ ...rest, password: hash });

    const saved = await newUser.save();

    // Convertir a objeto plano y eliminar la contraseña
    const userToReturn = saved.toObject();
    delete userToReturn.password;

    res.status(201).json({ id: saved._id, user: userToReturn });
  } catch (err) {
    if (err.code === 11000) {
      const duplicatedField = Object.keys(err.keyValue)[0];
      return res.status(400).json({ error: `${duplicatedField} ya está en uso.` });
    }
    console.error('Error al guardar el usuario:', err);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
};

// //crear un nuevo usuario VIEJO
// const createUser = async (req, res) => {
//   try {
//     const newUser = new User(req.body);
//     const saved = await newUser.save();
//     res.status(201).json({ id: saved._id, user: saved }); //devuelve el ID de mongo
//   } catch (err) {
//     if (err.code === 11000) {
//       // Error de duplicado
//       const duplicatedField = Object.keys(err.keyValue)[0];
//       return res.status(400).json({ error: `${duplicatedField} ya está en uso.` }); //error si se repiten las primary keys
//     }
//     console.error('Error al guardar el usuario:', err);
//     res.status(500).json({ error: 'Error al guardar en la base de datos' });
//   }
// };

// función que verifica si un usuario existe y el id es válido
//lo tuve que poner aca tambien para no tener dependencias circulares
const isValidUserId = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return false;

  const exists = await User.exists({ _id: id });
  return !!exists;
};

const isValidGroupId = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    console.log('ID no válido como ObjectId');
    return false;
  }

  const exists = await Group.exists({ _id: id });
  return !!exists;
};

//funcion interna que devuelve el objeto usuario a partir de su ID
//-----------------> MIRAR SI NO ES LO MISMO QUE findid (EL QUE VIENE CON MONGO)
const fetchUserById = async (id) => {
  if (!id) throw new Error('Falta el id del usuario');

  // Reutilizo isValidUserId para validar formato y existencia
  const exists = await isValidUserId(id);
  if (!exists) throw new Error('Usuario no encontrado o id no válido');

  // Como el usuario existe, lo busco completo
  const user = await User.findById(id);
  return user;
};

//funcion interna que devuelve el objeto usuario a partir de su USERNAME
const fetchUserByUsername = async (username) => {
  if (!username) throw new Error('Falta el username');

  const user = await User.findOne({ username });

  if (!user) throw new Error('Usuario no encontrado');

  return user;
};
///--------------------------------------------------------
//devuelve todos los datos del usuario. Hay que pasarle el id de mongo en este formato http://localhost:3000/user/6839fc99705dbc0534b703f2
const getUser = async (req, res) => {
  try {
    const id = req.userId; //NUEVOID req.params.id;
    const user = await fetchUserById(id);

    const userObj = user.toObject(); // convierte el documento Mongoose a objeto plano
    delete userObj.password; // elimina el campo

    res.json(userObj);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(400).json({ error: error.message });
  }
};


//funcion que devuelve los grupos de un usuario (Id)
const getUserGroupsId = async (userId) => {
  try {
    // Buscar al usuario y verificar existencia
    const user = await User.findById(userId);
    if (!user) throw new Error('Usuario no encontrado');
    return user.id_groups;
  } catch (error) {
    throw new Error(error.message);
  }
};

//funcion que devuelve los grupos de un usuario
const getUserGroups = async (req, res) => {
  try {
    const userId = req.userId; //NUEVOID req.params.id;
    const groupIds = await getUserGroupsId(userId);
    const groups = await Group.find({ _id: { $in: groupIds } }).select('_id name color');

    const formattedGroups = groups.map(group => ({
      id: group._id,
      name: group.name,
      color: group.color,
    }));

    res.json({ groups: formattedGroups });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//funcion que devuelve las invitaciones de un usuario
const getUserPendingGroups = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('id_pending_groups');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

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

    // Si viene una nueva imagen, la subimos a S3 y actualizamos el campo photo
    if (req.file) {
      const imageUrl = await uploadImageToS3(req.file);
      updates.photo = imageUrl;
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
    const userId = req.userId;
    const { habit } = req.body;

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
//funciona para poder agregar habito a otro grupo. la usa la funcion add group to habit
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
const loadHabitUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { habitName, post_photo } = req.body;

    if (!userId || !habitName || !post_photo) {
      return res.status(400).json({ error: 'Faltan datos requeridos: userId, habitName o post_photo' });
    }


    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const habit = user.habits.find(h => h.name === habitName);
    if (!habit) {
      return res.status(404).json({ error: 'Hábito no encontrado en el usuario.'});
    }

    // Crear nuevo post
    const newPost = {
      date: now,
      photo: post_photo,
      likes: [],
      dislikes: []
    };

    // Agregar post y fecha
    habit.posts.push(newPost);
    habit.post_dates.push(now);

    // Actualizar weekly_counter
    habit.weekly_counter[dayIndex] = 1;

    //Actualizar cantidad de monedas
    user.coins = user.coins + 1;

    // Guardar cambios en el documento del usuario
    await user.save();

    res.status(200).json({ message: 'Hábito actualizado correctamente'});
  } catch (error) {
    console.error('Error al cargar hábito del usuario:', error);
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error en la base de datos' });
  }
};

//funcion para agregar un grupo a un habito. 
//ademas tendria que fijarse si la persona esta en ese grupo no??!! NO ESTA HECHO pero no se si es necesario
const addGroupToHabit = async (req, res) => {
  try {
    const userId = req.userId;
    const { habitName, newGroupId } = req.body;

    if (!userId || !habitName || !newGroupId) {
      return res.status(400).json({ error: 'Faltan datos requeridos: userId, habitName o newGroupId' });
    }

    if (!mongoose.Types.ObjectId.isValid(newGroupId)) {
      return res.status(400).json({ error: 'El ID del grupo no es un ObjectId válido' });
    }
    //ver si el grupo existe
    const groupExists = await isValidGroupId(newGroupId);
    if (!groupExists) {
      return res.status(404).json({ error: 'El grupo especificado no existe en la base de datos' });
    }

    // editHabitUser espera un array en id_groups
    const updatedHabit = await editHabitUser(userId, habitName, { id_groups: [newGroupId] });

    res.status(200).json({ message: 'Grupo agregado correctamente al hábito'});
  } catch (error) {
    console.error('Error al agregar grupo al hábito:', error);
    res.status(400).json({ error: error.message || 'Error en la base de datos' });
  }
};

// trae los habitos que tiene en un grupo X una persona Y
// http://localhost:3000/user/683a43189ad5fb59ad9b182e/683796960242fdee4c5c4e4e/getHabitsInGroupsFromUser
const getHabitsInGroupFromUser = async (req, res) => {
  try {
    const userId = req.userId;
    const groupId  = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'El userId no es válido' });
    }

    const groupExists = await isValidGroupId(groupId);
    if (!groupExists) {
      return res.status(404).json({ error: 'El grupo especificado no existe' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const filteredHabits = user.habits.filter(habit =>
      habit.id_groups.some(id => id.toString() === groupId)
    );

    res.status(200).json({ habits: filteredHabits });
  } catch (error) {
    console.error('Error al obtener hábitos del usuario en el grupo:', error);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
};

// funcion que devuelve los habitos de un usuario
const getUserHabits = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('habits')
      .lean(); // Retorna un objeto plano de JS

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Remover los campos 'posts' y 'post_dates' de cada hábito
    const cleanedHabits = user.habits.map(habit => {
      const { posts, post_dates, ...rest } = habit;
      return rest;
    });

    res.status(200).json({ habits: cleanedHabits });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// trae todos los usuarios que tienen al menos un grupo en común con el usuario dado por id,
// junto con los grupos que tienen en común
// http://localhost:3000/user/683a43189ad5fb59ad9b182e/getUsersWithGroupsInCommon
const getUsersWithGroupsInCommon = async (req, res) => {
  const userId = req.userId;

  try {
    if (!userId) throw new Error('Falta el id del usuario');
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error('El id no es válido');

    const user = await User.findById(userId); //--> no se si tienen sentido las funciones q hice arriba del tdodo
    if (!user) throw new Error('Usuario no encontrado');

    const userGroupIds = user.id_groups.map(g => g.toString());

    if (userGroupIds.length === 0) {
      return res.json([]); // sin grupos, no comparte con nadie
    }

    const otherUsers = await User.find({
      _id: { $ne: userId },
      id_groups: { $in: userGroupIds }
    });

    const result = otherUsers.map(otherUser => {
      const otherGroupIds = otherUser.id_groups.map(g => g.toString());
      const commonGroups = otherGroupIds.filter(g => userGroupIds.includes(g));

      return {
        user: otherUser,
        commonGroups
      };
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//para traer los datos del feed, tengo que rearmar las funciones para que sean internas
// Versión pura sin req/res para getUsersWithGroupsInCommon
const getUsersWithGroupsInCommonInternal = async (userId) => {
  if (!userId) throw new Error('Falta el id del usuario');
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error('El id no es válido');

  const user = await User.findById(userId);
  if (!user) throw new Error('Usuario no encontrado');

  const userGroupIds = user.id_groups.map(g => g.toString());
  if (userGroupIds.length === 0) return [];

  const otherUsers = await User.find({
    _id: { $ne: userId },
    id_groups: { $in: userGroupIds }
  });

  return otherUsers.map(otherUser => {
    const otherGroupIds = otherUser.id_groups.map(g => g.toString());
    const commonGroups = otherGroupIds.filter(g => userGroupIds.includes(g));
    return { user: otherUser, commonGroups };
  });
};

// Versión pura sin req/res para getHabitsInGroupFromUser
const getHabitsInGroupFromUserInternal = async (userId, groupId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error('UserId no válido');
  const groupExists = await isValidGroupId(groupId);
  if (!groupExists) throw new Error('Grupo no existe');

  const user = await User.findById(userId);
  if (!user) throw new Error('Usuario no encontrado');

  return user.habits.filter(habit =>
    habit.id_groups.some(id => id.toString() === groupId)
  );
};

//Funcion interna que devuelve todos los habitos de un usuario al pasarle su userID
//---- FALTA HACER LA EXTERNA
const getUserHabitsInternal = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  return user.habits;
};


// userlike y userdislike te dicen si el usuario likeo ese post en especifico o no idem dilike
// ordenados por fecha
const getFeedPosts = async (req, res) => {
  try {
    const userId = req.userId;

    const usersWithGroups = await getUsersWithGroupsInCommonInternal(userId);
    const feedPosts = [];

    for (const { user: otherUser, commonGroups } of usersWithGroups) {
      let userHabits = [];

      for (const groupId of commonGroups) {
        const habits = await getHabitsInGroupFromUserInternal(otherUser._id.toString(), groupId);
        userHabits = userHabits.concat(habits);
      }

      // Eliminar hábitos duplicados
      const uniqueHabits = Array.from(new Map(userHabits.map(h => [h._id.toString(), h])).values());

      // Recolectar todos los posts individualmente
      for (const habit of uniqueHabits) {
        for (const post of habit.posts) {
          feedPosts.push({
            username: otherUser.username,
            userPhoto: otherUser.photo,
            habitName: habit.name,
            habitIcon: habit.icon,
            postDate: post.date,
            postPhoto: post.photo,
            likes: post.likes,
            dislikes: post.dislikes,
            userLike: post.likes.some(id => id.toString() === userId.toString()),
            userDislike: post.dislikes.some(id => id.toString() === userId.toString())
          });
        }
      }
    }

    // Agregar también los posts del propio usuario
    const currentUser = await User.findById(userId);
    const ownHabits = await getUserHabitsInternal(userId);

    for (const habit of ownHabits) {
      for (const post of habit.posts) {
        feedPosts.push({
          username: currentUser.username,
          habitName: habit.name,
          habitIcon: habit.icon,
          postDate: post.date,
          postPhoto: post.photo,
          likes: post.likes,
          dislikes: post.dislikes,
          userLike: post.likes.some(id => id.toString() === userId.toString()),
          userDislike: post.dislikes.some(id => id.toString() === userId.toString())
        });
      }
    }

    // Ordenar por fecha (más reciente primero)
    feedPosts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

    res.json(feedPosts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Funcion que borra un post
const deletePost = async (req, res) => {
  try {
    const userId = req.userId;
    const { habitName, postDate } = req.body;

    if (!userId || !habitName || !postDate) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const exists = await isValidUserId(userId);
    if (!exists) throw new Error('Usuario no encontrado o id no válido');

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const habit = user.habits.find(h => h.name === habitName);
    if (!habit) return res.status(404).json({ error: 'Hábito no encontrado en el usuario' });

    const parsedDate = new Date(postDate);

    // Buscar índice del post
    const postIndex = habit.posts.findIndex(p => new Date(p.date).getTime() === parsedDate.getTime());
    if (postIndex === -1) return res.status(404).json({ error: 'Post no encontrado con esa fecha' });

    // Borrar el post y su fecha
    habit.posts.splice(postIndex, 1);
    habit.post_dates = habit.post_dates.filter(d => new Date(d).getTime() !== parsedDate.getTime());

    // Restar 1 moneda si tiene al menos 1
    if (user.coins > 0) {
      user.coins -= 1;
    }

    // Weekcounter
    const dayIndex = (parsedDate.getDay() + 6) % 7;

    // Actualizar weekly_counter
    habit.weekly_counter[dayIndex] = 0;

    // Guardar cambios
    await user.save();

    res.status(200).json({ message: 'Post borrado correctamente y moneda descontada' });
  } catch (error) {
    console.error('Error al borrar post:', error);
    res.status(400).json({ error: error.message || 'Error en la base de datos' });
  }
};


//Da las mascotas de un usuario y el nombre del grupo(mascotas de cada grupo al que pertenece)
const getUserPets = async (req, res) => {
  try {
    const id = req.userId;

    // Buscar usuario por id y poblar grupos
    const user = await User.findById(id).populate('id_groups');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Extraer nombre del grupo + datos de mascota
    const pets = user.id_groups.map(group => ({
      group_name: group.name,
      pet_name: group.pet_name,
      pet_status: group.pet_status
    }));

    res.json({ pets });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Funcion con la logica de poner/sacar likes y dislikes
const addLikes = async (req, res) => {
  try {
    const userId = req.userId;
    const { postOwnerUserId, habitName, postDate, like, dislike } = req.body;

    if (!userId || !postOwnerUserId || !habitName || !postDate || like == null || dislike == null) {
      return res.status(400).json({ error: 'Faltan datos requeridos'});
    }
    
    const exists = await isValidUserId(userId);
    if (!exists) throw new Error('Usuario no encontrado o id no válido');

    // Buscar al usuario dueño del post
    const owner = await User.findById(postOwnerUserId);
    if (!owner) return res.status(404).json({ error: 'Usuario dueño del post no encontrado' });

    // Buscar el hábito
    const habit = owner.habits.find(h => h.name === habitName);
    if (!habit) return res.status(404).json({ error: 'Hábito no encontrado en el usuario' });

    // Buscar el post por fecha exacta
    const parsedDate = new Date(postDate);
    const post = habit.posts.find(p => new Date(p.date).getTime() === parsedDate.getTime());

    if (!post) return res.status(404).json({ error: 'Post no encontrado con esa fecha' });


    const userIdStr = userId.toString(); // para comparación segura
    const alreadyLiked = post.likes.some(id => id.toString() === userIdStr);
    const alreadyDisliked = post.dislikes.some(id => id.toString() === userIdStr);

    if (like) {
      if (!alreadyLiked) {
        post.likes.push(userId);
      }
    } else {
      if (alreadyLiked) {
        post.likes = post.likes.filter(id => id.toString() !== userIdStr);
      }
    }

    if (dislike) {
      if (!alreadyDisliked) {
        post.dislikes.push(userId);
      }
    } else {
      if (alreadyDisliked) {
        post.dislikes = post.dislikes.filter(id => id.toString() !== userIdStr);
      }
    }
    await owner.save();
    res.status(200).json({ message: 'Likes actaulizados correctamente'});
  } catch (error) {
    console.error('Error al actualizar likes:', error);
    res.status(400).json({ error: error.message || 'Error en la base de datos' });
  }
};


// Funcion con la logica de agregar usuarios a un grupo (mandar invitacion)
// usuario que manda inivtacion tinee que pertenecer al grupo? refinarlo ?
const addPendingGroup = async (req, res) => {
  try {
    const { friendUserId, groupId } = req.body;

    if (!friendUserId || !groupId) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Buscar usuario por id
    const userFriend = await User.findById(friendUserId);
    if (!userFriend) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si el grupo ya está en id_groups o id_pending_groups
    const alreadyMember = userFriend.id_groups.includes(groupId);
    const alreadyPending = userFriend.id_pending_groups.includes(groupId);

    if (alreadyMember) {
      return res.status(400).json({ error: 'El usuario ya pertenece al grupo' });
    }

    if (alreadyPending) {
      return res.status(400).json({ error: 'Ya hay una invitación pendiente para este grupo' });
    }

    // Agregar el grupo a pending si no estaba
    userFriend.id_pending_groups.push(groupId);
    await userFriend.save();

    res.status(200).json({ message: 'Grupo agregado a invitaciones pendientes correctamente' });
  } catch (error) {
    console.error('Error al agregar amigo al grupo:', error);
    res.status(400).json({ error: error.message || 'Error en la base de datos' });
  }
};


// Funcion con la logica de aceptar invitacion a grupo
// accepted es un bool
const acceptPendingGroup = async (req, res) => {
  try {
    const userId = req.userId;
    const { groupId, accepted } = req.body; 

    if (!userId || !groupId || accepted ==  null) {
      return res.status(400).json({ error: 'Faltan datos requeridos'});
    }
    
    // Buscar usuario por id
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    user.id_pending_groups = user.id_pending_groups.filter(
      gId => gId.toString() !== groupId
    );

    if (accepted) {
      // Evitar duplicados
      if (!user.id_groups.some(gId => gId.toString() === groupId)) {
        user.id_groups.push(groupId);
      }
    }
    await user.save();
    res.status(200).json({ message: 'Invitacion aceptada/ rechazada correctamenre'});
  } catch (error) {
    console.error('Error aceptar/rechazar invitacion:', error);
    res.status(400).json({ error: error.message || 'Error en la base de datos' });
  }
};

const getUserScore = async (req, res) => {
  const id = req.userId;
  try {
    // Buscar usuario por id
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Si no tiene hábitos, el score es 0
    if (!user.habits || user.habits.length === 0) {
      return res.status(200).json({ username: user.username, score: 0 });
    }

    // Calcular promedio de scores de todos los hábitos
    const totalScore = user.habits.reduce((sum, habit) => sum + (habit.score || 0), 0);
    const averageScore = totalScore / user.habits.length;

    // Devolver solo username y score
    res.status(200).json({
      _id: user._id,
      score: averageScore
    });
  } catch (error) {
    console.error('Error getting user score:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



module.exports = {
  createUser,
  getUser,
  editUser,
  createHabitUser,
  loadHabitUser,
  addGroupToHabit,
  getUserHabits,
  getUserGroups,
  getUserPendingGroups,
  getHabitsInGroupFromUser,
  getUsersWithGroupsInCommon,
  getFeedPosts,
  getHabitsInGroupFromUserInternal,
  getUserPets,
  addLikes,
  deletePost,
  addPendingGroup,
  acceptPendingGroup,
  loginUser,
  getUserScore
};
