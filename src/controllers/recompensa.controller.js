const prisma = require('../lib/prisma');

// ─── FIDELIDAD (tarjeta de sellos) ───────────────────────────────────────────
// Cada 30 viajes completados = 1 viaje gratis
const getFidelidad = async (req, res) => {
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    // Contar viajes completados (escaneados por conductor)
    const totalViajes = await prisma.viaje.count({
      where: {
        pasajeroId: pasajero.id,
        estado: { in: ['EN_CURSO', 'COMPLETADO'] },
      },
    });

    // Viajes gratis ganados
    const viajesGratisGanados = Math.floor(totalViajes / 30);

    // Canjes ya utilizados (puntos = -1 indica canje usado)
    const viajesGratisUsados = await prisma.recompensa.count({
      where: { pasajeroId: pasajero.id, puntos: -1 },
    });

    const viajesGratisDisponibles = Math.max(0, viajesGratisGanados - viajesGratisUsados);
    const sellosActuales = totalViajes % 30; // Progreso en la tarjeta actual

    // Historial de canjes usados
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

// ─── CANJEAR VIAJE GRATIS ────────────────────────────────────────────────────
const canjearViajeGratis = async (req, res) => {
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    // Verificar que tiene viajes gratis disponibles
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

    // Registrar el canje (puntos = -1 = ticket usado)
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

// ─── OTORGAR RECOMPENSA (admin) ──────────────────────────────────────────────
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
