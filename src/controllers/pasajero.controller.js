const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const prisma = require('../lib/prisma');

const getPerfil = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: { pasajero: true },
    });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

const actualizarPerfil = async (req, res) => {
  const { nombres, apellidos, fechaNacimiento, sexo, tipoCarnet } = req.body;
  try {
    const usuario = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { nombres, apellidos, fechaNacimiento: new Date(fechaNacimiento), sexo },
    });

    const pasajero = await prisma.pasajero.update({
      where: { usuarioId: req.usuario.id },
      data: { tipoCarnet },
    });

    res.json({ usuario, pasajero });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

const getSaldo = async (req, res) => {
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });
    res.json({ saldo: pasajero.saldo });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener saldo' });
  }
};

const recargarSaldo = async (req, res) => {
  const { monto } = req.body;
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const recarga = await prisma.recarga.create({
      data: {
        pasajeroId: pasajero.id,
        monto,
        estado: 'COMPLETADO',
      },
    });

    await prisma.pasajero.update({
      where: { id: pasajero.id },
      data: { saldo: pasajero.saldo + monto },
    });

    res.json({ mensaje: 'Saldo recargado exitosamente', recarga });
  } catch (error) {
    res.status(500).json({ error: 'Error al recargar saldo' });
  }
};

const generarQR = async (req, res) => {
  const { rutaId, paraderoInicio, paraderoFin, monto } = req.body;
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const { tipoCarnet } = pasajero;

    const CARNETS_GRATIS = ['POLICIA', 'MILITAR', 'DISCAPACITADO'];
    
    const CARNETS_PRECIO_FIJO = ['UNIVERSITARIO', 'ESCOLAR'];

    let precioFinal = 0;

    if (CARNETS_GRATIS.includes(tipoCarnet)) {
      
      precioFinal = 0;
    } else {
      const tarifario = await prisma.tarifario.findFirst({
        where: { tipoCarnet, activo: true },
      });

      if (!tarifario) {
        return res.status(400).json({ error: 'No hay tarifa configurada para tu tipo de carnet' });
      }

      if (CARNETS_PRECIO_FIJO.includes(tipoCarnet)) {
        
        precioFinal = tarifario.precio;
      } else {

        precioFinal = monto && parseFloat(monto) > 0 ? parseFloat(monto) : tarifario.precio;
      }

      if (pasajero.saldo < precioFinal) {
        return res.status(400).json({ error: 'Saldo insuficiente' });
      }
    }

    const qrCodigo = uuidv4();

    const viaje = await prisma.viaje.create({
      data: {
        pasajeroId: pasajero.id,
        rutaId,
        paraderoInicio,
        paraderoFin,
        qrCodigo,
        estado: 'PENDIENTE',
        montoDescontado: precioFinal,
      },
    });

    const qrImagen = await QRCode.toDataURL(qrCodigo);
    res.json({ viaje, qrImagen, precioFinal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar QR' });
  }
};

const getMisViajes = async (req, res) => {
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const viajes = await prisma.viaje.findMany({
      where: { pasajeroId: pasajero.id },
      include: { ruta: true, penalidad: true },
      orderBy: { creadoEn: 'desc' },
    });

    res.json(viajes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viajes' });
  }
};

const getRecargas = async (req, res) => {
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const recargas = await prisma.recarga.findMany({
      where: { pasajeroId: pasajero.id },
      orderBy: { creadoEn: 'desc' },
    });

    res.json(recargas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recargas' });
  }
};

const getComunicados = async (req, res) => {
  try {
    const comunicados = await prisma.comunicado.findMany({
      orderBy: { creadoEn: 'desc' },
      take: 5,
      include: {
        administrador: {
          include: { usuario: { select: { nombres: true, apellidos: true } } },
        },
      },
    });
    res.json(comunicados);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener comunicados' });
  }
};

const getViajeActivoEstado = async (req, res) => {
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const viaje = await prisma.viaje.findFirst({
      where: { pasajeroId: pasajero.id, estado: 'EN_CURSO' },
      select: { id: true, alertaPasajero: true, paraderoFin: true, estado: true },
    });

    if (!viaje) return res.json({ tieneViajeActivo: false });

    res.json({
      tieneViajeActivo: true,
      viajeId: viaje.id,
      alerta: viaje.alertaPasajero,
      paraderoFin: viaje.paraderoFin,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estado del viaje' });
  }
};

const confirmarAlerta = async (req, res) => {
  const { viajeId } = req.params;
  try {
    await prisma.viaje.update({
      where: { id: viajeId },
      data: { alertaPasajero: null },
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al confirmar alerta' });
  }
};

const bajarDelBus = async (req, res) => {
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const viaje = await prisma.viaje.findFirst({
      where: { pasajeroId: pasajero.id, estado: 'EN_CURSO' },
    });

    if (!viaje) {
      return res.status(404).json({ error: 'No tienes un viaje activo' });
    }

    if (viaje.alertaPasajero === 'PASADO') {
      return res.status(400).json({
        error: 'El conductor ya pasó tu destino. La penalidad fue aplicada automáticamente.',
      });
    }

    const viajeActualizado = await prisma.viaje.update({
      where: { id: viaje.id },
      data: {
        estado: 'COMPLETADO',
        alertaPasajero: null,
      },
    });

    res.json({ ok: true, viaje: viajeActualizado });
  } catch (error) {
    console.error('Error bajar del bus:', error);
    res.status(500).json({ error: 'Error al registrar bajada' });
  }
};

module.exports = { getPerfil, actualizarPerfil, getSaldo, recargarSaldo, generarQR, getMisViajes, getRecargas, getComunicados, getViajeActivoEstado, confirmarAlerta, bajarDelBus };
