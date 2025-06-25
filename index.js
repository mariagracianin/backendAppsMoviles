require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const UpdateLog = require('./models/UpdateLog');
const { ejecutarTareaDiaria } = require('./controllers/updateLogController');
// const User = require('./models/User');
// const Group = require('./models/Group');


const app = express();
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Conectado a MongoDB Atlas');
    verificarActualizacion(); // 👈 se ejecuta al arrancar
  })
  .catch(err => console.error('Error al conectar MongoDB', err));

// Tarea programada todos los días a las 00:00
cron.schedule('17 21 * * *', async () => { //esto cambiarlo!!!!!!!
  await ejecutarTareaDiaria();
});

// Verifica si se perdió alguna ejecución diaria
async function verificarActualizacion() {
  try {
    // Buscar el último log (ordenado por fecha descendente)
    const ultimoLog = await UpdateLog.findOne({ taskName: 'daily-update' })
                                     .sort({ date: -1 });

    if (!ultimoLog) {
      console.log('Nunca se ejecutó la tarea. Ejecutando ahora...');
      await ejecutarTareaDiaria();
      return;
    }

    const ahora = new Date();
    const diferenciaHoras = (ahora - new Date(ultimoLog.date)) / (1000 * 60 * 60);

    if (diferenciaHoras >= 24) {
      console.log('Pasaron más de 24h desde la última ejecución. Ejecutando ahora...');
      await ejecutarTareaDiaria();
    } else {
      console.log(`Última ejecución fue hace ${diferenciaHoras.toFixed(2)} horas.`);
    }

  } catch (error) {
    console.error('Error verificando última ejecución:', error);
  }
}

app.get('/historial-actualizaciones', async (req, res) => {
  const logs = await UpdateLog.find().sort({ date: -1 });
  res.json(logs);
});

// --- RUTAS ---
app.use('/user', userRoutes);
app.use('/group', groupRoutes);

console.log("✔ Rutas /user y /group cargadas bien");

// --- SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
