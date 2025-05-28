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
app.get('/', (req, res) => {
  res.send('¡Hola desde Express!');
});

// Rutas
app.use('/user', userRoutes);
app.use('/group', groupRoutes);

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
