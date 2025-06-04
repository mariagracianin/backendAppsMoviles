const express = require('express');
const router = express.Router();
const { createGroup } = require('../controllers/groupController');
const { editGroup } = require('../controllers/groupController');
const { getUsersFromGroup } = require('../controllers/groupController');
const { getHabitsFromGroup } = require('../controllers/groupController');


router.post('/create', createGroup);
router.post('/edit', editGroup);
router.get('/:groupId/getUsers', getUsersFromGroup);
router.get('/:groupId/getHabits', getHabitsFromGroup);




module.exports = router;