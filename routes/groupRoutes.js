const express = require('express');
const router = express.Router();
const {
  createGroup,
  editGroup,
  getUsersFromGroup,
  getHabitsFromGroup
} = require('../controllers/groupController');

const authMiddleware = require('../middlewares/auth');

// Rutas protegidas
router.post('/create', authMiddleware, createGroup);
router.post('/edit', authMiddleware, editGroup);
router.get('/:groupId/getUsers', authMiddleware, getUsersFromGroup);
router.get('/:groupId/getHabits', authMiddleware, getHabitsFromGroup);

console.log("✔ Rutas de grupo cargadas");

module.exports = router;
