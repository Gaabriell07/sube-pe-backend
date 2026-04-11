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
  crearTarifario,
  getTarifario,
};
