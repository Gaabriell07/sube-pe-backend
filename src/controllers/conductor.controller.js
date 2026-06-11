const prisma = require('../lib/prisma');
const conductorService = require('../services/conductor.service');

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

const escanearQR = async (req, res) => {
  const { qrCodigo } = req.body;

  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });

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

    await prisma.pasajero.update({
      where: { id: viaje.pasajeroId },
      data: { saldo: { decrement: viaje.montoDescontado } },
    });

    await prisma.conductor.update({
      where: { id: conductor.id },
      data: { saldo: { increment: viaje.montoDescontado } },
    });

    await prisma.viaje.update({
      where: { id: viaje.id },
      data: {
        estado: 'EN_CURSO',
        conductorId: conductor.id,
        escaneadoEn: new Date(),
      },
    });

    await prisma.qrEscaneo.create({
      data: { qrCodigo, conductorId: conductor.id, exitoso: true },
    });

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

const getPasajerosActivos = async (req, res) => {
  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const activos = await prisma.viaje.findMany({
      where: { conductorId: conductor.id, estado: 'EN_CURSO' },
      include: {
        pasajero: { include: { usuario: true } },
        ruta: { include: { paraderos: true } },
      },
      orderBy: { escaneadoEn: 'desc' },
    });

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

    await prisma.conductor.update({
      where: { id: conductor.id },
      data: { paraderoActualIdx: paraderoIdx },
    });

    const viajesActivos = await prisma.viaje.findMany({
      where: { conductorId: conductor.id, estado: 'EN_CURSO' },
    });

    const alertasGeneradas = [];

    for (const viaje of viajesActivos) {
      const destinoIdx = PARADEROS.indexOf(viaje.paraderoFin);
      if (destinoIdx === -1) continue; 

      const diff = destinoIdx - paraderoIdx;

      let alerta = null;

      if (diff === 1) {
        
        alerta = 'CERCA_DESTINO';
        await prisma.viaje.update({ where: { id: viaje.id }, data: { alertaPasajero: alerta } });
        alertasGeneradas.push({ viajeId: viaje.id, alerta, destino: viaje.paraderoFin });

      } else if (diff === 0) {
        
        alerta = 'EN_DESTINO';
        await prisma.viaje.update({ where: { id: viaje.id }, data: { alertaPasajero: alerta } });
        alertasGeneradas.push({ viajeId: viaje.id, alerta, destino: viaje.paraderoFin });

      } else if (diff < 0) {
        
        const montoExtra = 2.00;

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

const getGananciasHoy = async (req, res) => {
  try {
    const conductor = await prisma.conductor.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    if (!conductor) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }

    const ganancias = await conductorService.getGananciasHoy(conductor.id);
    res.json(ganancias);
  } catch (error) {
    console.error('Error al obtener ganancias:', error);
    res.status(500).json({ error: 'Error al obtener ganancias del día' });
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
  getGananciasHoy,
};
