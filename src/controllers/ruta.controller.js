const prisma = require('../lib/prisma');

// ─── OBTENER RUTAS ───────────────────────────────────────────────────────────
const getRutas = async (req, res) => {
  try {
    const rutas = await prisma.ruta.findMany({
      include: {
        paraderos: { orderBy: { orden: 'asc' } },
      },
    });
    res.json(rutas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rutas' });
  }
};

// ─── OBTENER RUTA POR ID ─────────────────────────────────────────────────────
const getRuta = async (req, res) => {
  const { id } = req.params;
  try {
    const ruta = await prisma.ruta.findUnique({
      where: { id },
      include: {
        paraderos: { orderBy: { orden: 'asc' } },
      },
    });

    if (!ruta) return res.status(404).json({ error: 'Ruta no encontrada' });

    res.json(ruta);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ruta' });
  }
};

// ─── CREAR RUTA ──────────────────────────────────────────────────────────────
const crearRuta = async (req, res) => {
  const { nombre, paraderos } = req.body;
  try {
    const ruta = await prisma.ruta.create({
      data: {
        nombre,
        paraderos: {
          create: paraderos.map((p, index) => ({
            nombre: p.nombre,
            latitud: p.latitud,
            longitud: p.longitud,
            orden: index + 1,
          })),
        },
      },
      include: {
        paraderos: { orderBy: { orden: 'asc' } },
      },
    });

    res.status(201).json({ mensaje: 'Ruta creada exitosamente', ruta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear ruta' });
  }
};

// ─── AGREGAR PARADERO ────────────────────────────────────────────────────────
const agregarParadero = async (req, res) => {
  const { id } = req.params;
  const { nombre, latitud, longitud, orden } = req.body;
  try {
    const paradero = await prisma.paradero.create({
      data: { rutaId: id, nombre, latitud, longitud, orden },
    });

    res.status(201).json({ mensaje: 'Paradero agregado exitosamente', paradero });
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar paradero' });
  }
};

// ─── ELIMINAR RUTA ───────────────────────────────────────────────────────────
const eliminarRuta = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.paradero.deleteMany({ where: { rutaId: id } });
    await prisma.ruta.delete({ where: { id } });

    res.json({ mensaje: 'Ruta eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar ruta' });
  }
};

module.exports = { getRutas, getRuta, crearRuta, agregarParadero, eliminarRuta };
