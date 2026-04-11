const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storage.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.use(verificarToken);

router.post('/subir', upload.single('archivo'), storageController.subirArchivo);
router.get('/mis-archivos', storageController.getMisArchivos);
router.delete('/:id', storageController.eliminarArchivo);

module.exports = router;
