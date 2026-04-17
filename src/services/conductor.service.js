const prisma = require('../lib/prisma');

/**
 * Obtiene las ganancias detalladas del conductor para el día actual.
 *
 * SRP  → esta función tiene una única responsabilidad: calcular ganancias.
 * DIP  → el controller depende de este servicio (abstracción), no de Prisma.
 *
 * @param {string} conductorId - ID interno del conductor (tabla Conductor)
 * @returns {Promise<{ totalHoy: number, totalViajes: number, desglose: Array, ultimosViajes: Array }>}
 */
async function getGananciasHoy(conductorId) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Todos los viajes escaneados hoy por este conductor (EN_CURSO o COMPLETADO)
  const viajes = await prisma.viaje.findMany({
    where: {
      conductorId,
      estado: { in: ['EN_CURSO', 'COMPLETADO'] },
      escaneadoEn: { gte: hoy },
    },
    include: {
      pasajero: {
        select: { tipoCarnet: true },
      },
    },
    orderBy: { escaneadoEn: 'desc' },
  });

  // ── Totales globales ──────────────────────────────────────────────────────
  const totalHoy    = viajes.reduce((acc, v) => acc + v.montoDescontado, 0);
  const totalViajes = viajes.length;

  // ── Desglose por tipo de carnet ───────────────────────────────────────────
  const mapaDesglose = {};
  for (const v of viajes) {
    const tipo = v.pasajero?.tipoCarnet ?? 'NORMAL';
    if (!mapaDesglose[tipo]) mapaDesglose[tipo] = { tipo, cantidad: 0, subtotal: 0 };
    mapaDesglose[tipo].cantidad += 1;
    mapaDesglose[tipo].subtotal = +(mapaDesglose[tipo].subtotal + v.montoDescontado).toFixed(2);
  }
  const desglose = Object.values(mapaDesglose);

  // ── Últimos 10 viajes del día (para la lista de historial) ────────────────
  const ultimosViajes = viajes.slice(0, 10).map((v) => ({
    id:      v.id,
    hora:    v.escaneadoEn
      ? new Date(v.escaneadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
      : '—',
    origen:  v.paraderoInicio,
    destino: v.paraderoFin,
    monto:   v.montoDescontado,
    tipo:    v.pasajero?.tipoCarnet ?? 'NORMAL',
  }));

  return {
    totalHoy:    +totalHoy.toFixed(2),
    totalViajes,
    desglose,
    ultimosViajes,
  };
}

module.exports = { getGananciasHoy };
