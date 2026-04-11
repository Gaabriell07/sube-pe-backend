const prisma = require('../lib/prisma');

// ─── PERFIL ──────────────────────────────────────────────────────────────────
const getPerfil = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: {
        conductor: {
          include: {
            unidades: { include: { unidad: true } },
          },
        },
      },
    });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

// ─── SALDO ───────────────────────────────────────────────────────────────────
const getSaldo = async (req, res) => {
  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });
    res.json({ saldo: conductor.saldo });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener saldo' });
  }
};

// ─── ESCANEAR QR ─────────────────────────────────────────────────────────────
const escanearQR = async (req, res) => {
  const { qrCodigo } = req.body;

  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    // Buscar el viaje con ese QR
    const viaje = await prisma.viaje.findUnique({
      where: { qrCodigo },
      include: {
        pasajero: { include: { usuario: true } },
        ruta: true,
      },
    });

    if (!viaje) {
      await prisma.qrEscaneo.create({
        data: { qrCodigo, conductorId: conductor.id, exitoso: false },
      });
      return res.status(404).json({ error: 'QR no válido' });
    }

    if (viaje.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Este QR ya fue usado' });
    }

    // Descontar saldo al pasajero
    await prisma.pasajero.update({
      where: { id: viaje.pasajeroId },
      data: { saldo: { decrement: viaje.montoDescontado } },
    });

    // Acreditar comisión al conductor
    await prisma.conductor.update({
      where: { id: conductor.id },
      data: { saldo: { increment: viaje.montoDescontado } },
    });

    // Actualizar viaje a EN_CURSO
    await prisma.viaje.update({
      where: { id: viaje.id },
      data: {
        estado: 'EN_CURSO',
        conductorId: conductor.id,
        escaneadoEn: new Date(),
      },
    });

    // Registrar escaneo exitoso
    await prisma.qrEscaneo.create({
      data: { qrCodigo, conductorId: conductor.id, exitoso: true },
    });

    // Otorgar puntos al pasajero por el viaje (10 puntos base por viaje)
    await prisma.recompensa.create({
      data: {
        pasajeroId: viaje.pasajeroId,
        puntos: 10,
        motivo: `Viaje completado: ${viaje.paraderoInicio} → ${viaje.paraderoFin}`,
      },
    });

    res.json({
      mensaje: 'QR escaneado exitosamente ✅',
      vibrar: true,
      pasajero: {
        nombres: viaje.pasajero.usuario.nombres,
        apellidos: viaje.pasajero.usuario.apellidos,
        tipoCarnet: viaje.pasajero.tipoCarnet,
        destino: viaje.paraderoFin,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al escanear QR' });
  }
};

// ─── PASAJEROS ACTIVOS ───────────────────────────────────────────────────────
const getPasajerosActivos = async (req, res) => {
  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    // Pasajeros actualmente a bordo (EN_CURSO)
    const activos = await prisma.viaje.findMany({
      where: { conductorId: conductor.id, estado: 'EN_CURSO' },
      include: {
        pasajero: { include: { usuario: true } },
        ruta: { include: { paraderos: true } },
      },
      orderBy: { escaneadoEn: 'desc' },
    });

    // Viajes validados hoy (EN_CURSO + COMPLETADO escaneados hoy)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const validadosHoy = await prisma.viaje.count({
      where: {
        conductorId: conductor.id,
        estado: { in: ['EN_CURSO', 'COMPLETADO'] },
        escaneadoEn: { gte: hoy },
      },
    });

    res.json({ activos, validadosHoy });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pasajeros activos' });
  }
};

// ─── SISTEMA DE TURNO POR PARADEROS ──────────────────────────────────────────
// Lista maestro de paraderos en orden Norte → Sur (mismo orden que el frontend)
const PARADEROS = [
  'SANTA ROSA', 'PROC. DE LA INDEPENDENCIA', 'ACHO', 'PIZARRO - CAQUETA',
  'ALFONSO UGARTE', 'AV. BRASIL', 'AV. DEL EJERCITO', 'PARDO - MIRAFLORES',
  'AV. BENAVIDES', 'TOMAS MARSANO', 'SAN JUAN DE MIRAFLORES',
  'VILLA EL SALVADOR', 'LAS PALMAS',
];

const iniciarTurno = async (req, res) => {
  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    // Obtener la ruta CPSA (primera disponible)
    const ruta = await prisma.ruta.findFirst({
      include: { paraderos: { orderBy: { orden: 'asc' } } },
    });

    if (!ruta) return res.status(404).json({ error: 'No hay rutas configuradas' });

    await prisma.conductor.update({
      where: { id: conductor.id },
      data: { turnoActivo: true, paraderoActualIdx: 0, rutaActivaId: ruta.id },
    });

    res.json({ mensaje: 'Turno iniciado', ruta: ruta.nombre, paraderoActual: PARADEROS[0], paraderos: PARADEROS });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar turno' });
  }
};

const getTurnoActivo = async (req, res) => {
  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    if (!conductor.turnoActivo) return res.json({ turnoActivo: false });

    res.json({
      turnoActivo: true,
      paraderoActualIdx: conductor.paraderoActualIdx ?? 0,
      paraderoActual: PARADEROS[conductor.paraderoActualIdx ?? 0],
      paraderos: PARADEROS,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener turno' });
  }
};

const siguienteParadero = async (req, res) => {
  const { paraderoIdx } = req.body;

  if (paraderoIdx === undefined || paraderoIdx < 0 || paraderoIdx >= PARADEROS.length) {
    return res.status(400).json({ error: 'Índice de paradero inválido' });
  }

  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    // Actualizar posición del conductor
    await prisma.conductor.update({
      where: { id: conductor.id },
      data: { paraderoActualIdx: paraderoIdx },
    });

    // Obtener todos los viajes EN_CURSO de este conductor
    const viajesActivos = await prisma.viaje.findMany({
      where: { conductorId: conductor.id, estado: 'EN_CURSO' },
    });

    const alertasGeneradas = [];

    for (const viaje of viajesActivos) {
      const destinoIdx = PARADEROS.indexOf(viaje.paraderoFin);
      if (destinoIdx === -1) continue; // paradero no encontrado, saltar

      const diff = destinoIdx - paraderoIdx;

      let alerta = null;

      if (diff === 1) {
        // Falta 1 paradero para su destino
        alerta = 'CERCA_DESTINO';
        await prisma.viaje.update({ where: { id: viaje.id }, data: { alertaPasajero: alerta } });
        alertasGeneradas.push({ viajeId: viaje.id, alerta, destino: viaje.paraderoFin });

      } else if (diff === 0) {
        // El conductor está exactamente en el paradero del pasajero
        alerta = 'EN_DESTINO';
        await prisma.viaje.update({ where: { id: viaje.id }, data: { alertaPasajero: alerta } });
        alertasGeneradas.push({ viajeId: viaje.id, alerta, destino: viaje.paraderoFin });

      } else if (diff < 0) {
        // El pasajero se pasó de su destino → penalidad
        const montoExtra = 2.00;

        // Verificar que no tenga ya una penalidad para este viaje
        const penalidad = await prisma.penalidad.findUnique({ where: { viajeId: viaje.id } });
        if (!penalidad) {
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
        }

        await prisma.viaje.update({
          where: { id: viaje.id },
          data: { estado: 'PENALIZADO', alertaPasajero: 'PASADO' },
        });

        alertasGeneradas.push({ viajeId: viaje.id, alerta: 'PASADO', destino: viaje.paraderoFin });
      }
    }

    res.json({
      paraderoActual: PARADEROS[paraderoIdx],
      paraderoIdx,
      alertasGeneradas: alertasGeneradas.length,
      detalle: alertasGeneradas,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar paradero' });
  }
};

const finalizarTurno = async (req, res) => {
  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    await prisma.conductor.update({
      where: { id: conductor.id },
      data: { turnoActivo: false, paraderoActualIdx: null, rutaActivaId: null },
    });

    res.json({ mensaje: 'Turno finalizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al finalizar turno' });
  }
};

module.exports = {
  getPerfil,
  getSaldo,
  escanearQR,
  getPasajerosActivos,
  iniciarTurno,
  getTurnoActivo,
  siguienteParadero,
  finalizarTurno,
};
