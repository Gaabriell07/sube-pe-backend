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
router.post('/tarifario', adminController.crearTarifario);
router.get('/tarifario', adminController.getTarifario);

module.exports = router;
