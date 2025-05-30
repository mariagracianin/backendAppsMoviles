const express = require('express');
const router = express.Router();
const { createUser } = require('../controllers/userController');
const { getUser } = require('../controllers/userController');
const { editUser } = require('../controllers/userController');
const { createHabitUser } = require('../controllers/userController');
const { loadHabitUser } = require('../controllers/userController');
const { addGroupToHabit } = require('../controllers/userController');
const { getUserGroups } = require('../controllers/userController');
const { getUserPendingGroups } = require('../controllers/userController');

router.post('/create', createUser);
router.get('/:id', getUser);
router.post('/edit', editUser);
router.post('/createHabit', createHabitUser); //chequear que no exista ese nombre
router.post('/loadHabit', loadHabitUser);
router.post('/addGroupToHabit', addGroupToHabit);
router.get('/:id/groups', getUserGroups);
router.get('/:id/pendingGroups', getUserPendingGroups);

// router.post('/login', loginUser);

module.exports = router;
