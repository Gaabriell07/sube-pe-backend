const prisma = require('../lib/prisma');

const crearSolicitud = async (req, res) => {
  const { tipoCarnetSolicitado, urlImagenDocumento } = req.body;
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    if (!pasajero) return res.status(404).json({ error: 'Pasajero no encontrado' });

    const solicitudPendiente = await prisma.solicitudCarnet.findFirst({
      where: { pasajeroId: pasajero.id, estado: 'PENDIENTE' },
    });

    if (solicitudPendiente) {
      return res.status(400).json({ error: 'Ya tienes una solicitud de carnet en proceso de revisión.' });
    }

    const nuevaSolicitud = await prisma.solicitudCarnet.create({
      data: {
        pasajeroId: pasajero.id,
        tipoCarnetSolicitado,
        urlImagenDocumento,
      },
    });

    res.status(201).json({ mensaje: 'Solicitud enviada exitosamente', solicitud: nuevaSolicitud });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la solicitud de carnet' });
  }
};

const getMisSolicitudes = async (req, res) => {
  try {
    const pasajero = await prisma.pasajero.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const solicitudes = await prisma.solicitudCarnet.findMany({
      where: { pasajeroId: pasajero.id },
      orderBy: { creadoEn: 'desc' },
    });

    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const getTodasLasSolicitudes = async (req, res) => {
  const estado = req.query.estado || 'PENDIENTE';
  try {
    const solicitudes = await prisma.solicitudCarnet.findMany({
      where: { estado },
      include: {
        pasajero: {
          include: {
            usuario: { select: { nombres: true, apellidos: true, dni: true, email: true } },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });

    res.json(solicitudes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const aprobarSolicitud = async (req, res) => {
  const { id } = req.params;
  try {
    const solicitud = await prisma.solicitudCarnet.findUnique({ where: { id } });
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

    await prisma.$transaction([
      prisma.solicitudCarnet.update({
        where: { id },
        data: { estado: 'APROBADA', revisadoEn: new Date() },
      }),
      prisma.pasajero.update({
        where: { id: solicitud.pasajeroId },
        data: { tipoCarnet: solicitud.tipoCarnetSolicitado },
      })
    ]);

    res.json({ mensaje: 'Solicitud aprobada y perfil de pasajero actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al aprobar solicitud' });
  }
};

const rechazarSolicitud = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  try {
    const solicitud = await prisma.solicitudCarnet.findUnique({ where: { id } });
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

    await prisma.solicitudCarnet.update({
      where: { id },
      data: { estado: 'RECHAZADA', revisadoEn: new Date(), motivoRechazo: motivo },
    });

    res.json({ mensaje: 'Solicitud rechazada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
};

module.exports = {
  crearSolicitud,
  getMisSolicitudes,
  getTodasLasSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
};
