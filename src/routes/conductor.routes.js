const express = require('express');
const router = express.Router();
const conductorController = require('../controllers/conductor.controller');
const { verificarToken, soloRol } = require('../middlewares/auth.middleware');

router.use(verificarToken);
router.use(soloRol('CONDUCTOR'));

router.get('/perfil',             conductorController.getPerfil);
router.get('/saldo',              conductorController.getSaldo);
router.post('/escanear-qr',       conductorController.escanearQR);
router.get('/pasajeros-activos',  conductorController.getPasajerosActivos);

// ─── Sistema de turno por paraderos ──────────────────────────────────────────
router.get('/turno-activo',         conductorController.getTurnoActivo);
router.post('/iniciar-turno',       conductorController.iniciarTurno);
router.post('/siguiente-paradero',  conductorController.siguienteParadero);
router.post('/finalizar-turno',     conductorController.finalizarTurno);

// ─── Ganancias ────────────────────────────────────────────────────────────────
router.get('/ganancias-hoy',        conductorController.getGananciasHoy);

module.exports = router;
