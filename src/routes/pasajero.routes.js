const express = require('express');
const router = express.Router();
const pasajeroController = require('../controllers/pasajero.controller');
const recompensaController = require('../controllers/recompensa.controller');
const { verificarToken, soloRol } = require('../middlewares/auth.middleware');

router.use(verificarToken);
router.use(soloRol('PASAJERO'));

router.get('/perfil', pasajeroController.getPerfil);
router.put('/perfil', pasajeroController.actualizarPerfil);
router.get('/saldo', pasajeroController.getSaldo);
router.post('/recargar', pasajeroController.recargarSaldo);
router.post('/generar-qr', pasajeroController.generarQR);
router.get('/viajes', pasajeroController.getMisViajes);
router.get('/recargas', pasajeroController.getRecargas);
router.get('/comunicados', pasajeroController.getComunicados);
router.get('/puntos', recompensaController.getFidelidad);
router.post('/canjear-viaje-gratis', recompensaController.canjearViajeGratis);

router.get('/viaje-activo-estado',          pasajeroController.getViajeActivoEstado);
router.post('/confirmar-alerta/:viajeId',   pasajeroController.confirmarAlerta);

router.post('/bajar',                       pasajeroController.bajarDelBus);

const solicitudesController = require('../controllers/solicitudes.controller');
router.post('/solicitud-carnet', solicitudesController.crearSolicitud);
router.get('/mis-solicitudes', solicitudesController.getMisSolicitudes);

module.exports = router;
