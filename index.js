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

    // Crear grupos
    const groupA = new (require('./models/Group'))({
      id: 1,
      name: 'Grupo A',
      photo: 'https://via.placeholder.com/150',
      pet_name: 'Toby',
      pet_status: 'feliz'
    });
    const savedGroupA = await groupA.save();

    const groupB = new (require('./models/Group'))({
      id: 2,
      name: 'Grupo B',
      photo: 'https://via.placeholder.com/150',
      pet_name: 'Luna',
      pet_status: 'hambrienta'
    });
    const savedGroupB = await groupB.save();

    // Crear usuarios
    const User = require('./models/User');
    const users = [];

    for (let i = 1; i <= 10; i++) {
      const groupIds = [];
      if (i <= 7) groupIds.push(savedGroupA._id);
      if (i >= 6) groupIds.push(savedGroupB._id);

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
          weekly_counter: [1, 1, 1, 0, 0, 0, 1]
        }]
      }));
    }

    await User.insertMany(users);

    res.send('Base de datos inicializada con 2 grupos y 10 usuarios 🎉');
  } catch (error) {
    console.error('Error inicializando datos:', error);
    res.status(500).send('Error al inicializar datos de prueba');
  }
});

// Rutas
app.use('/user', userRoutes);
app.use('/group', groupRoutes);

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
