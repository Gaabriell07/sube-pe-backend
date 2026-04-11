const prisma = require('../lib/prisma');

// Calcula distancia entre dos coordenadas en metros
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ─── ACTUALIZAR UBICACIÓN ────────────────────────────────────────────────────
const actualizarUbicacion = async (req, res) => {
  const { latitud, longitud, viajeId } = req.body;

  try {
    const viaje = await prisma.viaje.findUnique({
      where: { id: viajeId },
      include: {
        ruta: { include: { paraderos: { orderBy: { orden: 'asc' } } } },
        pasajero: true,
      },
    });

    if (!viaje || viaje.estado !== 'EN_CURSO') {
      return res.status(400).json({ error: 'Viaje no encontrado o no activo' });
    }

    // Buscar el paradero destino
    const paraderoDestino = viaje.ruta.paraderos.find(
      (p) => p.nombre === viaje.paraderoFin
    );

    if (!paraderoDestino) {
      return res.status(400).json({ error: 'Paradero destino no encontrado' });
    }

    const distancia = calcularDistancia(
      latitud,
      longitud,
      paraderoDestino.latitud,
      paraderoDestino.longitud
    );

    res.json({
      distanciaAlDestino: Math.round(distancia),
      paraderoDestino: paraderoDestino.nombre,
      llegando: distancia < 200, // menos de 200 metros
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar ubicación' });
  }
};

// ─── VERIFICAR RUTA ──────────────────────────────────────────────────────────
const verificarRuta = async (req, res) => {
  const { latitud, longitud, viajeId } = req.body;

  try {
    const viaje = await prisma.viaje.findUnique({
      where: { id: viajeId },
      include: {
        ruta: { include: { paraderos: { orderBy: { orden: 'asc' } } } },
        pasajero: true,
      },
    });

    if (!viaje || viaje.estado !== 'EN_CURSO') {
      return res.status(400).json({ error: 'Viaje no encontrado o no activo' });
    }

    const paraderoDestino = viaje.ruta.paraderos.find(
      (p) => p.nombre === viaje.paraderoFin
    );

    if (!paraderoDestino) {
      return res.status(400).json({ error: 'Paradero destino no encontrado' });
    }

    const distanciaAlDestino = calcularDistancia(
      latitud,
      longitud,
      paraderoDestino.latitud,
      paraderoDestino.longitud
    );

    // Si el pasajero se pasó más de 500 metros del destino
    if (distanciaAlDestino > 500) {
      // Aplicar penalidad
      const montoExtra = 2.0;

      await prisma.penalidad.create({
        data: {
          pasajeroId: viaje.pasajeroId,
          viajeId: viaje.id,
          monto: montoExtra,
          motivo: `Pasajero se pasó del destino ${viaje.paraderoFin}`,
        },
      });

      await prisma.pasajero.update({
        where: { id: viaje.pasajeroId },
        data: { saldo: { decrement: montoExtra } },
      });

      await prisma.viaje.update({
        where: { id: viaje.id },
        data: { estado: 'PENALIZADO' },
      });

      return res.json({
        penalizado: true,
        mensaje: 'Te pasaste de tu destino, se aplicó una penalidad',
        montoDescontado: montoExtra,
      });
    }

    res.json({
      penalizado: false,
      distanciaAlDestino: Math.round(distanciaAlDestino),
      mensaje: 'En ruta correctamente',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al verificar ruta' });
  }
};

// ─── UBICACIONES ACTIVAS PARA CONDUCTOR ──────────────────────────────────────
const getUbicacionesActivas = async (req, res) => {
  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const viajes = await prisma.viaje.findMany({
      where: {
        conductorId: conductor.id,
        estado: 'EN_CURSO',
      },
      include: {
        pasajero: { include: { usuario: true } },
        ruta: { include: { paraderos: true } },
      },
    });

    res.json(viajes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ubicaciones' });
  }
};

module.exports = { actualizarUbicacion, verificarRuta, getUbicacionesActivas };
