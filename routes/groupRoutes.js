const express = require('express');
const router = express.Router();
const {
  createGroup,
  editGroup,
  getUsersFromGroup,
  getHabitsFromGroup, 
  getGroupRanking,
  getGroup,
  deleteGroup
} = require('../controllers/groupController');

const authMiddleware = require('../middlewares/auth');

// Rutas protegidas
router.post('/create', authMiddleware, createGroup);
router.post('/edit', authMiddleware, editGroup);

router.delete('/deleteGroup', authMiddleware, deleteGroup);

router.get('/:groupId', authMiddleware, getGroup);
router.get('/:groupId/getUsers', authMiddleware, getUsersFromGroup);
router.get('/:groupId/getHabits', authMiddleware, getHabitsFromGroup);
router.get('/:groupId/getGroupRanking', authMiddleware, getGroupRanking);

console.log("✔ Rutas de grupo cargadas");

module.exports = router;
