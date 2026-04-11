const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/registro', authController.registro);
router.post('/login', authController.login);
router.post('/recuperar-password', authController.recuperarPassword);
router.post('/registro-google', authController.registroGoogle);

module.exports = router;
