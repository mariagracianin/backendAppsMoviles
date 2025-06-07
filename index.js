require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');

const app = express();
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error al conectar MongoDB', err));

// Ruta base
app.get('/', async (req, res) => {
  try {
    // Eliminar datos anteriores
    await mongoose.connection.db.dropDatabase();

    // Crear modelos
    const Group = require('./models/Group');
    const User = require('./models/User');

    // Crear grupos
    const groupA = new Group({
      id: 1,
      name: 'Grupo A',
      photo: 'https://via.placeholder.com/150',
      pet_name: 'Toby',
      pet_status: 'feliz'
    });
    const savedGroupA = await groupA.save();

    const groupB = new Group({
      id: 2,
      name: 'Grupo B',
      photo: 'https://via.placeholder.com/150',
      pet_name: 'Luna',
      pet_status: 'hambrienta'
    });
    const savedGroupB = await groupB.save();

    // Crear usuarios
    const users = [];

    for (let i = 1; i <= 10; i++) {
      const groupIds = [];
      if (i <= 7) groupIds.push(savedGroupA._id);
      if (i >= 6) groupIds.push(savedGroupB._id);

      // Generar 3 posts falsos
      const posts = [];
      for (let j = 0; j < 3; j++) {
        posts.push({
          date: new Date(Date.now() - j * 86400000),
          photo: `https://picsum.photos/200/300?random=${i}${j}`,
          likes: [],
          dislikes: []
        });
      }

      users.push(new User({
        mail: `user${i}@example.com`,
        password: `password${i}`,
        username: `user${i}`,
        photo: `https://randomuser.me/api/portraits/lego/${i}.jpg`,
        id_groups: groupIds,
        id_pending_groups: [],
        habits: [{
          name: 'Beber agua',
          frequency: 7,
          score: Math.floor(Math.random() * 10),
          icon: '💧',
          color: '#00f',
          weekly_counter: [1, 1, 1, 0, 0, 0, 1],
          posts: posts,
          post_dates: posts.map(p => p.date),
          id_groups: [...groupIds] // 👈 importante: clonado
        }]
      }));
    }


    await User.insertMany(users);

    // Actualizar posts con likes/dislikes dentro del mismo grupo
    const allUsers = await User.find(); // obtener usuarios insertados

    for (const user of allUsers) {
      for (const habit of user.habits) {
        for (const post of habit.posts) {
          // Obtener usuarios del mismo grupo (incluyendo a sí mismo)
          const groupMemberIds = new Set();
          for (const groupId of habit.id_groups) {
            const groupMembers = allUsers.filter(
              u => u.id_groups.some(gid => gid.toString() === groupId.toString())
            );
            groupMembers.forEach(u => groupMemberIds.add(u._id.toString()));
          }

          const groupMemberArray = Array.from(groupMemberIds);

          // Asignar likes y dislikes aleatorios (permitiendo autolike)
          const likeCount = Math.floor(Math.random() * groupMemberArray.length);
          const dislikeCount = Math.floor(Math.random() * (groupMemberArray.length - likeCount));

          const shuffled = groupMemberArray.sort(() => 0.5 - Math.random());
          post.likes = shuffled.slice(0, likeCount);
          post.dislikes = shuffled.slice(likeCount, likeCount + dislikeCount);
        }
      }

      await user.save(); // guardar cambios en el usuario
    }

    res.send('Base de datos inicializada con hábitos vinculados a grupos 🎯');
  } catch (error) {
    console.error('Error inicializando datos:', error);
    res.status(500).send('Error al inicializar datos de prueba');
  }
});


// Rutas
app.use('/user', userRoutes);
app.use('/group', groupRoutes);

console.log("✔ Rutas /user y /group carrgadas bien");


// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
