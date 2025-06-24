const express = require('express');
const router = express.Router();
const {
  createUser, getUser, editUser, createHabitUser, loadHabitUser,
  addGroupToHabit, getUserGroups, getUserPendingGroups, getUserPets,
  getHabitsInGroupFromUser, getUsersWithGroupsInCommon, getFeedPosts,
  addLikes, deletePost, addPendingGroup, acceptPendingGroup, getUserHabits,
  loginUser, getUserScore, deleteFriendFromGroup, getPhoto
} = require('../controllers/userController');
const upload = require('../middlewares/upload');
const authMiddleware = require('../middlewares/auth');

router.post('/login', loginUser);
router.post('/create', createUser);

// Rutas protegidas (requieren token)
router.post('/edit', authMiddleware, upload.single('photo'), editUser);
router.post('/createHabit', authMiddleware, createHabitUser);
router.post('/loadHabit', authMiddleware, upload.single('post_photo'), loadHabitUser);
router.post('/addGroupToHabit', authMiddleware, addGroupToHabit);
router.post('/addLikes', authMiddleware, addLikes);
router.post('/addPendingGroup', authMiddleware, addPendingGroup);
router.post('/acceptPendingGroup', authMiddleware, acceptPendingGroup);
router.post('/deleteFriendFromGroup', authMiddleware, deleteFriendFromGroup);
router.delete('/deletePost', authMiddleware, deletePost);

// GET protegidos (si querés que se requiera estar logueado)
router.get('/me', authMiddleware, getUser);
router.get('/me/habits', authMiddleware, getUserHabits);
router.get('/me/groups', authMiddleware, getUserGroups);
router.get('/me/pendingGroups', authMiddleware, getUserPendingGroups);
router.get('/me/pets', authMiddleware, getUserPets);
router.get('/me/:groupId/getHabitsInGroupsFromUser', authMiddleware, getHabitsInGroupFromUser); //--> Falta hacer request de postman
router.get('/me/getUsersWithGroupsInCommon', authMiddleware, getUsersWithGroupsInCommon);
router.get('/me/getFeedPosts', authMiddleware, getFeedPosts);
router.get('/me/getUserScore', authMiddleware, getUserScore);
router.get('/me/imagenes/:key', authMiddleware, getPhoto);

console.log("✔ Rutas de usuario cargadas");

module.exports = router;
