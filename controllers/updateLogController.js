const User = require('../models/User');
const Group = require('../models/Group');
const UpdateLog = require('../models/UpdateLog');
const mongoose = require('mongoose');


async function ejecutarTareaDiaria() {
  try {
    console.log('Ejecutando tarea programada...');
    const now = new Date();

    if (now.getDay() === 2) {
        await resetWeeklyCounter(); 
    }

    const userCount = await User.countDocuments();
    const groupCount = await Group.countDocuments();

    // Crear nuevo registro (historial)
    const nuevoLog = new UpdateLog({
      taskName: 'daily-update',
      date: now,
      userCount: userCount,
      groupCount: groupCount
    });

    await nuevoLog.save();

    console.log(`Log guardado: ${userCount} usuarios, ${groupCount} grupos, fecha ${now.toISOString()}`);
  } catch (error) {
    console.error('Error en tarea diaria:', error);
  }
}


const resetWeeklyCounter = async () => {
  try {
    const users = await User.find();

    for (const user of users) {
      let updated = false;

      for (const habit of user.habits) {
        // Solo actualiza si es necesario
        if (!Array.isArray(habit.weekly_counter) || habit.weekly_counter.some(val => val !== 0)) {
          habit.weekly_counter = [0, 0, 0, 0, 0, 0, 0];
          updated = true;
        }
      }

      if (updated) {
        await user.save();
      }
    }

    console.log('Todos los weekly_counter fueron reseteados correctamente.');
    return true;

  } catch (error) {
    console.error('Error reseteando weekly_counter:', error);
    return false;
  }
};

module.exports = {
  ejecutarTareaDiaria
};