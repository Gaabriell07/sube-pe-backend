const { PrismaClient } = require('@prisma/client');

// ── Singleton global ─────────────────────────────────────────────────────────
// Un solo PrismaClient con connection pool para toda la app.
// En Render (free tier) se recomiendan ≤5 conexiones concurrentes porque
// Supabase free permite max 20 y comparte con otras apps tuyas.
if (!global.__prisma) {
  global.__prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL, // pgbouncer=true ya configurado en .env
      },
    },
  });
}

module.exports = global.__prisma;
