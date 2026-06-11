const prisma = require('../lib/prisma');

async function getGananciasHoy(conductorId) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

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

  const totalHoy    = viajes.reduce((acc, v) => acc + v.montoDescontado, 0);
  const totalViajes = viajes.length;

  const mapaDesglose = {};
  for (const v of viajes) {
    const tipo = v.pasajero?.tipoCarnet ?? 'NORMAL';
    if (!mapaDesglose[tipo]) mapaDesglose[tipo] = { tipo, cantidad: 0, subtotal: 0 };
    mapaDesglose[tipo].cantidad += 1;
    mapaDesglose[tipo].subtotal = +(mapaDesglose[tipo].subtotal + v.montoDescontado).toFixed(2);
  }
  const desglose = Object.values(mapaDesglose);

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
