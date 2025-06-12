const User = require('../models/User');
const Group = require('../models/Group');
const UpdateLog = require('../models/UpdateLog');
const mongoose = require('mongoose');

// Si es domingo: reestablece weekly counter 
// Calcular score de habitos y de grupo (como el promedio de los scores de los habitos que estan en el grupo, considerando el peso de cada persona por igual (primero promedia los habitos de la persona, y despues de las diferentes personas del grupo))
// Borrar fotos de mas de una semana (7 dias) 
// Cambiar el estado de la mascota del grupo en base al score
async function ejecutarTareaDiaria() {
  try {
    console.log('Ejecutando tarea diaria...');
    const now = new Date(); 
    const sevenDaysAgo = new Date(now);
    
    sevenDaysAgo.setDate(now.getDate() - 7); //calcular 7 días para atras

    // Map para acumular scores por grupo. Es como un diccionario que tiene group id y un array con los puntajes individuales de cada persona del grupo de forma id usuario, puntaje.
    const groupScores = {};

    const users = await User.find().populate('id_groups'); //trae el objeto grupo de cada usuario

    for (const user of users) {
      let userModified = false;

      for (const habit of user.habits) {
        // Filtrar posts dentro de los últimos 7 días
        habit.posts = habit.posts.filter(post => post.date > sevenDaysAgo);

        // Filtrar post_dates recientes 
        const recentPostDates = habit.post_dates.filter(date => date > sevenDaysAgo);

        //quedarme con los posts de hace menos de 7 dias
        habit.posts = habit.posts.filter(post => post.date > sevenDaysAgo);

        // Calcular el score del hábito
        const frecuencia = habit.frequency;
        const habitScore = Math.min((recentPostDates.length / frecuencia) * 100, 100); //para que no se pueda pasar de 100 (ponerle un limite). Podria pasar si cambia de semana en el medio
        habit.score = Math.round(habitScore);

        // Resetear weekly_counter solo si es lunes (1)
        if (now.getDay() === 3) {
          habit.weekly_counter = [0, 0, 0, 0, 0, 0, 0];
        }

        // Acumular datos por grupo
        for (const groupId of habit.id_groups) {
          if (!groupScores[groupId]) { //se fija si ya existe una entrada para ese grupo en el diccionario
            groupScores[groupId] = []; //si no existe la crea
          }
          groupScores[groupId].push({
            userId: user._id.toString(), 
            score: habit.score
          });
        }

        userModified = true;
      }

      if (userModified) {
        await user.save();
      }
    }

    // Calcular el score final del grupo
    const groupAverages = {}; // Map<groupId, finalScore>

    for (const [groupId, entries] of Object.entries(groupScores)) {
      // Agrupar por usuario y promediar sus hábitos
      const userMap = new Map(); //guarda usuario y puntajes de habitos dentro el grupo

      for (const { userId, score } of entries) {
        if (!userMap.has(userId)) userMap.set(userId, []); 
        userMap.get(userId).push(score);
      }

      //calcular el promedio de los habitos de cada usuario. User averages es una array con todos los promedios (uno por usuario del grupo)
      const userAverages = Array.from(userMap.values()).map(scores => {
        const sum = scores.reduce((a, b) => a + b, 0);
        return sum / scores.length;
      });

      const groupScore = userAverages.length //un numero especifico (para ese grupo)
        ? userAverages.reduce((a, b) => a + b, 0) / userAverages.length
        : 0;

      groupAverages[groupId] = Math.round(groupScore); //gruoupId, finalScore

      // Actualizar grupo en base de datos
      const pet_status =
        groupScore < 33 ? 'sad' :
        groupScore < 66 ? 'happy' :
        'super happy';

      await Group.findByIdAndUpdate(groupId, {
        score: Math.round(groupScore),
        pet_status
      });
    }

    // Guardar log 
    const userCount = users.length;
    const groupCount = await Group.countDocuments();

    const nuevoLog = new UpdateLog({
      taskName: 'daily-update',
      date: now,
      userCount,
      groupCount
    });

    await nuevoLog.save();

    console.log('Tarea diaria completada exitosamente.');
    console.log(`Usuarios: ${userCount}, Grupos: ${groupCount}, Fecha: ${now.toISOString()}`);
  } catch (error) {
    console.error('Error en tarea diaria:', error);
  }
}

module.exports = {
  ejecutarTareaDiaria
};
