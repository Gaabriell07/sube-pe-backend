const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app    = express();
const PORT   = process.env.PORT || 3000;
const prisma = require('./lib/prisma');

// ── CORS ─────────────────────────────────────────────────────────────────────
// En producción (Render) solo acepta el origen del admin y la app.
// En desarrollo acepta cualquier origen.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : true; // true = todos los orígenes (solo desarrollo)

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
// Render lo llama para verificar que el servidor está vivo.
// También sirve para hacer "ping" y evitar el cold start en Render free.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ mensaje: 'Subepe Backend corriendo ✅' });
});

// ── Rutas ─────────────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth.routes');
const pasajeroRoutes   = require('./routes/pasajero.routes');
const conductorRoutes  = require('./routes/conductor.routes');
const adminRoutes      = require('./routes/admin.routes');
const gpsRoutes        = require('./routes/gps.routes');
const rutaRoutes       = require('./routes/ruta.routes');
const storageRoutes    = require('./routes/storage.routes');
const recompensaRoutes = require('./routes/recompensa.routes');

app.use('/api/auth',        authRoutes);
app.use('/api/pasajero',    pasajeroRoutes);
app.use('/api/conductor',   conductorRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/gps',         gpsRoutes);
app.use('/api/rutas',       rutaRoutes);
app.use('/api/storage',     storageRoutes);
app.use('/api/recompensas', recompensaRoutes);

// ── Iniciar servidor + conectar Prisma ────────────────────────────────────────
async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma conectado a Supabase');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Error al conectar Prisma:', err);
    process.exit(1);
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Render envía SIGTERM antes de detener el contenedor.
// Cerramos las conexiones limpiamente para evitar errores.
async function shutdown(signal) {
  console.log(`\n${signal} recibido — cerrando servidor...`);
  await prisma.$disconnect();
  console.log('🔌 Prisma desconectado. Hasta luego.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT')); // Ctrl+C en desarrollo

main();
