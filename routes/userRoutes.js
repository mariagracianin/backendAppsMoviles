const express = require('express');
const router = express.Router();
const { createUser } = require('../controllers/userController');


router.post('/create', createUser);
// router.post('/edit', editUser);
// router.post('/login', loginUser);
// router.post('/createHabit', createHabitUser); //chequear que no exista ese nombre
// router.post('/loadHabit', loadHabitUser);



module.exports = router;
