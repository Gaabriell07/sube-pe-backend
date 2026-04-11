const { PrismaClient } = require('@prisma/client');

// Singleton global — evita múltiples connection pools
// Ver: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
let prisma;

if (!global.__prisma) {
  global.__prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

prisma = global.__prisma;

module.exports = prisma;
