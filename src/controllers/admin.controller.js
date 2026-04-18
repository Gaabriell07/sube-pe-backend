const prisma = require('../lib/prisma');

// ─── PERFIL ──────────────────────────────────────────────────────────────────
const getPerfil = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: { administrador: true },
    });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

// ─── CONDUCTORES ─────────────────────────────────────────────────────────────
const getConductores = async (req, res) => {
  try {
    const conductores = await prisma.conductor.findMany({
      include: {
        usuario: true,
        unidades: { include: { unidad: true } },
      },
    });
    res.json(conductores);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener conductores' });
  }
};

const agregarConductor = async (req, res) => {
  const { email, password, nombres, apellidos, dni, fechaNacimiento, sexo } = req.body;
  try {
    // ── 1. Verificar que el DNI no esté en uso (ni pasajero ni conductor)
    if (dni) {
      const dniExistente = await prisma.usuario.findFirst({ where: { dni } });
      if (dniExistente) {
        return res.status(400).json({ error: 'Este DNI ya está registrado en el sistema. Verifica el documento del conductor.' });
      }
    }

    // ── 2. Crear usuario en Supabase Auth
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) return res.status(400).json({ error: authError.message });

    const usuario = await prisma.usuario.create({
      data: {
        supabaseId: authData.user.id,
        email,
        nombres,
        apellidos,
        dni,
        fechaNacimiento: new Date(fechaNacimiento),
        sexo,
        rol: 'CONDUCTOR',
      },
    });

    const conductor = await prisma.conductor.create({
      data: { usuarioId: usuario.id },
    });

    res.status(201).json({ mensaje: 'Conductor agregado exitosamente', usuario, conductor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al agregar conductor' });
  }
};

const quitarConductor = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.conductor.update({
      where: { id },
      data: { estado: 'INACTIVO' },
    });
    res.json({ mensaje: 'Conductor desactivado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al quitar conductor' });
  }
};

// ─── PAGAR SUELDO ────────────────────────────────────────────────────────────
const pagarSueldo = async (req, res) => {
  const { conductorId, monto } = req.body;
  try {
    const admin = await prisma.administrador.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const pago = await prisma.pagoSueldo.create({
      data: {
        conductorId,
        administradorId: admin.id,
        monto,
        estado: 'COMPLETADO',
      },
    });

    await prisma.conductor.update({
      where: { id: conductorId },
      data: { saldo: { increment: monto } },
    });

    res.json({ mensaje: 'Sueldo pagado exitosamente', pago });
  } catch (error) {
    res.status(500).json({ error: 'Error al pagar sueldo' });
  }
};

// ─── ASIGNAR UNIDAD ──────────────────────────────────────────────────────────
const asignarUnidad = async (req, res) => {
  const { conductorId, unidadId } = req.body;
  try {
    const asignacion = await prisma.unidadConductor.create({
      data: { conductorId, unidadId },
    });
    res.json({ mensaje: 'Unidad asignada exitosamente', asignacion });
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar unidad' });
  }
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());

    const [
      totalPasajeros,
      totalConductores,
      viajesMes,
      viajesSemana,
      recargasMes,
    ] = await Promise.all([
      prisma.pasajero.count(),
      prisma.conductor.count({ where: { estado: 'ACTIVO' } }),
      prisma.viaje.findMany({
        where: { creadoEn: { gte: inicioMes } },
      }),
      prisma.viaje.findMany({
        where: { creadoEn: { gte: inicioSemana } },
      }),
      prisma.recarga.findMany({
        where: { creadoEn: { gte: inicioMes }, estado: 'COMPLETADO' },
      }),
    ]);

    const ingresosMes = recargasMes.reduce((acc, r) => acc + r.monto, 0);

    res.json({
      totalPasajeros,
      totalConductores,
      viajesMes: viajesMes.length,
      viajesSemana: viajesSemana.length,
      ingresosMes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
};

// ─── COMUNICADOS ─────────────────────────────────────────────────────────────
const crearComunicado = async (req, res) => {
  const { titulo, contenido } = req.body;
  try {
    const admin = await prisma.administrador.findUnique({
      where: { usuarioId: req.usuario.id },
    });

    const comunicado = await prisma.comunicado.create({
      data: { administradorId: admin.id, titulo, contenido },
    });

    res.status(201).json({ mensaje: 'Comunicado creado exitosamente', comunicado });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear comunicado' });
  }
};

const getComunicados = async (req, res) => {
  try {
    const comunicados = await prisma.comunicado.findMany({
      include: { administrador: { include: { usuario: true } } },
      orderBy: { creadoEn: 'desc' },
    });
    res.json(comunicados);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener comunicados' });
  }
};

const eliminarComunicado = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.comunicado.delete({ where: { id } });
    res.json({ mensaje: 'Comunicado eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar comunicado' });
  }
};

// ─── TARIFARIO ───────────────────────────────────────────────────────────────
const crearTarifario = async (req, res) => {
  const { tipoCarnet, precio, descripcion } = req.body;
  try {
    // Desactivar tarifa anterior del mismo tipo
    await prisma.tarifario.updateMany({
      where: { tipoCarnet, activo: true },
      data: { activo: false },
    });

    const tarifario = await prisma.tarifario.create({
      data: { tipoCarnet, precio, descripcion },
    });

    res.status(201).json({ mensaje: 'Tarifa creada exitosamente', tarifario });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear tarifa' });
  }
};

const getTarifario = async (req, res) => {
  try {
    const tarifario = await prisma.tarifario.findMany({
      where: { activo: true },
      orderBy: { tipoCarnet: 'asc' },
    });
    res.json(tarifario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tarifario' });
  }
};

// ─── PASAJEROS (paginado) ─────────────────────────────────────────────────────
const getPasajeros = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip  = (page - 1) * limit;
  const buscar = req.query.buscar || '';

  try {
    const where = buscar
      ? {
          OR: [
            { usuario: { nombres:   { contains: buscar, mode: 'insensitive' } } },
            { usuario: { apellidos: { contains: buscar, mode: 'insensitive' } } },
            { usuario: { email:     { contains: buscar, mode: 'insensitive' } } },
            { usuario: { dni:       { contains: buscar, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [total, pasajeros] = await Promise.all([
      prisma.pasajero.count({ where }),
      prisma.pasajero.findMany({
        where,
        skip,
        take: limit,
        orderBy: { usuario: { creadoEn: 'desc' } },
        include: {
          usuario: { select: { nombres: true, apellidos: true, email: true, dni: true, creadoEn: true } },
          _count:  { select: { viajes: true } },
        },
      }),
    ]);

    res.json({ total, page, limit, totalPaginas: Math.ceil(total / limit), pasajeros });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener pasajeros' });
  }
};

// ─── VIAJES GLOBALES (paginado) ───────────────────────────────────────────────
const getViajes = async (req, res) => {
  const page   = parseInt(req.query.page)   || 1;
  const limit  = parseInt(req.query.limit)  || 25;
  const skip   = (page - 1) * limit;
  const estado = req.query.estado || undefined; // PENDIENTE | EN_CURSO | COMPLETADO | PENALIZADO

  try {
    const where = estado ? { estado } : {};

    const [total, viajes] = await Promise.all([
      prisma.viaje.count({ where }),
      prisma.viaje.findMany({
        where,
        skip,
        take: limit,
        orderBy: { creadoEn: 'desc' },
        include: {
          pasajero:  { include: { usuario: { select: { nombres: true, apellidos: true } } } },
          conductor: { include: { usuario: { select: { nombres: true, apellidos: true } } } },
          ruta:      { select: { nombre: true } },
          penalidad: true,
        },
      }),
    ]);

    res.json({ total, page, limit, totalPaginas: Math.ceil(total / limit), viajes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener viajes' });
  }
};

// ─── PENALIDADES ──────────────────────────────────────────────────────────────
const getPenalidades = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 25;
  const skip  = (page - 1) * limit;

  try {
    const [total, penalidades] = await Promise.all([
      prisma.penalidad.count(),
      prisma.penalidad.findMany({
        skip,
        take: limit,
        orderBy: { creadoEn: 'desc' },
        include: {
          pasajero: { include: { usuario: { select: { nombres: true, apellidos: true, email: true } } } },
          viaje:    { select: { paraderoInicio: true, paraderoFin: true, creadoEn: true } },
        },
      }),
    ]);

    res.json({ total, page, limit, totalPaginas: Math.ceil(total / limit), penalidades });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener penalidades' });
  }
};

// ─── UNIDADES (buses) ─────────────────────────────────────────────────────────
const getUnidades = async (req, res) => {
  try {
    const unidades = await prisma.unidad.findMany({
      include: {
        conductores: {
          include: {
            conductor: {
              include: { usuario: { select: { nombres: true, apellidos: true } } },
            },
          },
          orderBy: { asignadoEn: 'desc' },
          take: 1, // Solo el conductor más reciente
        },
      },
      orderBy: { nombre: 'asc' },
    });
    res.json(unidades);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener unidades' });
  }
};

const crearUnidad = async (req, res) => {
  const { placa, nombre } = req.body;
  if (!placa || !nombre) {
    return res.status(400).json({ error: 'Placa y nombre son requeridos' });
  }
  try {
    const unidad = await prisma.unidad.create({
      data: { placa: placa.toUpperCase().trim(), nombre: nombre.trim() },
    });
    res.status(201).json({ mensaje: 'Unidad creada exitosamente', unidad });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una unidad con esa placa' });
    }
    res.status(500).json({ error: 'Error al crear unidad' });
  }
};

const eliminarUnidad = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.unidad.delete({ where: { id } });
    res.json({ mensaje: 'Unidad eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar unidad' });
  }
};

module.exports = {
  getPerfil,
  getConductores,
  agregarConductor,
  quitarConductor,
  pagarSueldo,
  asignarUnidad,
  getDashboard,
  crearComunicado,
  getComunicados,
  eliminarComunicado,
  crearTarifario,
  getTarifario,
  // ── Nuevos ──────────────────
  getPasajeros,
  getViajes,
  getPenalidades,
  getUnidades,
  crearUnidad,
  eliminarUnidad,
};

