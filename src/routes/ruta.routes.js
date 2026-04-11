const express = require('express');
const router = express.Router();
const rutaController = require('../controllers/ruta.controller');
const { verificarToken, soloRol } = require('../middlewares/auth.middleware');

router.use(verificarToken);

router.get('/', rutaController.getRutas);
router.get('/:id', rutaController.getRuta);
router.post('/', soloRol('ADMINISTRADOR'), rutaController.crearRuta);
router.post('/:id/paraderos', soloRol('ADMINISTRADOR'), rutaController.agregarParadero);
router.delete('/:id', soloRol('ADMINISTRADOR'), rutaController.eliminarRuta);

module.exports = router;
