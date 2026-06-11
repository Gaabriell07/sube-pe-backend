const { PrismaClient } = require('@prisma/client');

if (!global.__prisma) {
  global.__prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL, 
      },
    },
  });
}

module.exports = global.__prisma;
