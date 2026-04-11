const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'Subepe Backend corriendo ✅' });
});

const authRoutes = require('./routes/auth.routes');
const pasajeroRoutes = require('./routes/pasajero.routes');
const conductorRoutes = require('./routes/conductor.routes');
const adminRoutes = require('./routes/admin.routes');
const gpsRoutes = require('./routes/gps.routes');
const rutaRoutes = require('./routes/ruta.routes');
const storageRoutes = require('./routes/storage.routes');
const recompensaRoutes = require('./routes/recompensa.routes');

// Rutas (las iremos agregando)
app.use('/api/auth', authRoutes);
app.use('/api/pasajero', pasajeroRoutes);
app.use('/api/conductor', conductorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/rutas', rutaRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/recompensas', recompensaRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
