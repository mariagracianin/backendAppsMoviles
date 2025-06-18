const express = require('express');
const router = express.Router();
const {
  createUser, getUser, editUser, createHabitUser, loadHabitUser,
  addGroupToHabit, getUserGroups, getUserPendingGroups, getUserPets,
  getHabitsInGroupFromUser, getUsersWithGroupsInCommon, getFeedPosts,
  addLikes, deletePost, addPendingGroup, acceptPendingGroup, getUserHabits,
  loginUser, getUserScore,getUserPhoto
} = require('../controllers/userController');
const upload = require('../middlewares/upload');
const authMiddleware = require('../middlewares/auth');

router.post('/login', loginUser);
router.post('/create', createUser);

// Rutas protegidas (requieren token)
router.post('/edit', authMiddleware, upload.single('photo'), editUser); //agregué esto
router.post('/createHabit', authMiddleware, createHabitUser);
router.post('/loadHabit', authMiddleware, loadHabitUser);
router.post('/addGroupToHabit', authMiddleware, addGroupToHabit);
router.post('/addLikes', authMiddleware, addLikes);
router.post('/addPendingGroup', authMiddleware, addPendingGroup);
router.post('/acceptPendingGroup', authMiddleware, acceptPendingGroup);
router.delete('/deletePost', authMiddleware, deletePost);

// GET protegidos (si querés que se requiera estar logueado)
router.get('/:id', authMiddleware, getUser);
router.get('/:id/habits', authMiddleware, getUserHabits);
router.get('/:id/groups', authMiddleware, getUserGroups);
router.get('/:id/pendingGroups', authMiddleware, getUserPendingGroups);
router.get('/:id/pets', authMiddleware, getUserPets);
router.get('/:userId/:groupId/getHabitsInGroupsFromUser', authMiddleware, getHabitsInGroupFromUser); //--> Falta hacer request de postman
router.get('/:id/getUsersWithGroupsInCommon', authMiddleware, getUsersWithGroupsInCommon);
router.get('/:id/getFeedPosts', authMiddleware, getFeedPosts);
router.get('/:id/getUserScore', authMiddleware, getUserScore);
router.get('/:id/photo', authMiddleware, getUserPhoto); 


console.log("✔ Rutas de usuario cargadas");

module.exports = router;
