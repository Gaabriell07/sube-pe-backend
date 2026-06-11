const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verificarToken, soloRol } = require('../middlewares/auth.middleware');

router.use(verificarToken);
router.use(soloRol('ADMINISTRADOR'));

router.get('/perfil', adminController.getPerfil);
router.get('/conductores', adminController.getConductores);
router.post('/conductores', adminController.agregarConductor);
router.delete('/conductores/:id', adminController.quitarConductor);
router.post('/pagar-sueldo', adminController.pagarSueldo);
router.post('/asignar-unidad', adminController.asignarUnidad);
router.get('/dashboard', adminController.getDashboard);
router.post('/comunicado', adminController.crearComunicado);
router.get('/comunicados', adminController.getComunicados);
router.delete('/comunicado/:id', adminController.eliminarComunicado);
router.post('/tarifario', adminController.crearTarifario);
router.get('/tarifario', adminController.getTarifario);

router.get('/pasajeros',         adminController.getPasajeros);
router.get('/viajes',            adminController.getViajes);
router.get('/penalidades',       adminController.getPenalidades);
router.get('/unidades',          adminController.getUnidades);
router.post('/unidades',         adminController.crearUnidad);
router.delete('/unidades/:id',   adminController.eliminarUnidad);

const solicitudesController = require('../controllers/solicitudes.controller');
router.get('/solicitudes-carnet',           solicitudesController.getTodasLasSolicitudes);
router.put('/solicitudes-carnet/:id/aprobar', solicitudesController.aprobarSolicitud);
router.put('/solicitudes-carnet/:id/rechazar', solicitudesController.rechazarSolicitud);

module.exports = router;

