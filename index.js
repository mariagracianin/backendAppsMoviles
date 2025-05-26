require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Item = require('./models/Item');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error al conectar MongoDB', err));

app.get('/', (req, res) => {
  res.send('¡Hola desde Express!');
});

app.post('/items', async (req, res) => {
  try {
    const nuevoItem = new Item({ nombre: req.body.nombre });
    const guardado = await nuevoItem.save();
    res.status(201).json(guardado);
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
