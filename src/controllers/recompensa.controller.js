const prisma = require('../lib/prisma');

const getFidelidad = async (req, res) => {
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const totalViajes = await prisma.viaje.count({
      where: {
        pasajeroId: pasajero.id,
        estado: { in: ['EN_CURSO', 'COMPLETADO'] },
      },
    });

    const viajesGratisGanados = Math.floor(totalViajes / 30);

    const viajesGratisUsados = await prisma.recompensa.count({
      where: { pasajeroId: pasajero.id, puntos: -1 },
    });

    const viajesGratisDisponibles = Math.max(0, viajesGratisGanados - viajesGratisUsados);
    const sellosActuales = totalViajes % 30; 

    const historialCanjes = await prisma.recompensa.findMany({
      where: { pasajeroId: pasajero.id, puntos: -1 },
      orderBy: { creadoEn: 'desc' },
    });

    res.json({
      totalViajes,
      sellosActuales,
      targetSellos: 30,
      viajesGratisGanados,
      viajesGratisUsados,
      viajesGratisDisponibles,
      historialCanjes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener fidelidad' });
  }
};

const canjearViajeGratis = async (req, res) => {
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const totalViajes = await prisma.viaje.count({
      where: { pasajeroId: pasajero.id, estado: { in: ['EN_CURSO', 'COMPLETADO'] } },
    });
    const ganados = Math.floor(totalViajes / 30);
    const usados = await prisma.recompensa.count({
      where: { pasajeroId: pasajero.id, puntos: -1 },
    });

    if (ganados - usados <= 0) {
      return res.status(400).json({ error: 'No tienes viajes gratis disponibles' });
    }

    await prisma.recompensa.create({
      data: {
        pasajeroId: pasajero.id,
        puntos: -1,
        motivo: 'Canje de viaje gratis utilizado',
      },
    });

    res.json({ mensaje: 'Viaje gratis canjeado. Genera tu QR normalmente — el costo será S/ 0.00' });
  } catch (error) {
    res.status(500).json({ error: 'Error al canjear viaje gratis' });
  }
};

const otorgarRecompensa = async (req, res) => {
  const { pasajeroId, puntos, motivo } = req.body;
  try {
    const recompensa = await prisma.recompensa.create({
      data: { pasajeroId, puntos, motivo },
    });
    res.status(201).json({ mensaje: 'Recompensa otorgada exitosamente', recompensa });
  } catch (error) {
    res.status(500).json({ error: 'Error al otorgar recompensa' });
  }
};

module.exports = { getFidelidad, canjearViajeGratis, otorgarRecompensa };
