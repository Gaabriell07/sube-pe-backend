const express = require('express');
const router = express.Router();
const gpsController = require('../controllers/gps.controller');
const { verificarToken, soloRol } = require('../middlewares/auth.middleware');

router.use(verificarToken);

router.post('/actualizar-ubicacion', soloRol('PASAJERO'), gpsController.actualizarUbicacion);
router.post('/verificar-ruta', soloRol('PASAJERO'), gpsController.verificarRuta);
router.get('/ubicaciones-activas', soloRol('CONDUCTOR'), gpsController.getUbicacionesActivas);

module.exports = router;
