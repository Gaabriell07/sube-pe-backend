const express = require('express');
const router = express.Router();
const recompensaController = require('../controllers/recompensa.controller');
const { verificarToken, soloRol } = require('../middlewares/auth.middleware');

router.use(verificarToken);

// Endpoints de fidelidad (pasajero)
router.get('/fidelidad', soloRol('PASAJERO'), recompensaController.getFidelidad);
router.post('/canjear-viaje-gratis', soloRol('PASAJERO'), recompensaController.canjearViajeGratis);

// Endpoint admin
router.post('/otorgar', soloRol('ADMINISTRADOR'), recompensaController.otorgarRecompensa);

module.exports = router;
