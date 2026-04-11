const { createClient } = require('@supabase/supabase-js');
const prisma = require('../lib/prisma');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─── REGISTRO ────────────────────────────────────────────────────────────────
const registro = async (req, res) => {
  const { email, password, nombres, apellidos, dni, fechaNacimiento, sexo, rol } = req.body;

  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // 2. Crear usuario en nuestra base de datos con Prisma
    const usuario = await prisma.usuario.create({
      data: {
        supabaseId: authData.user.id,
        email,
        nombres,
        apellidos,
        dni,
        fechaNacimiento: new Date(fechaNacimiento),
        sexo,
        rol,
      },
    });

    // 3. Crear perfil según el rol
    if (rol === 'PASAJERO') {
      await prisma.pasajero.create({
        data: { usuarioId: usuario.id },
      });
    } else if (rol === 'CONDUCTOR') {
      await prisma.conductor.create({
        data: { usuarioId: usuario.id },
      });
    } else if (rol === 'ADMINISTRADOR') {
      await prisma.administrador.create({
        data: { usuarioId: usuario.id, empresa: req.body.empresa || 'Subepe' },
      });
    }

    res.status(201).json({ mensaje: 'Usuario registrado exitosamente', usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(400).json({ error: error.message });

    // Obtener datos completos del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { supabaseId: data.user.id },
      include: {
        pasajero: true,
        conductor: true,
        administrador: true,
      },
    });

    res.json({
      token: data.session.access_token,
      usuario,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// ─── RECUPERAR PASSWORD ──────────────────────────────────────────────────────
const recuperarPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ mensaje: 'Correo de recuperación enviado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al recuperar contraseña' });
  }
};

// ─── REGISTRO CON GOOGLE ─────────────────────────────────────────────────────
const registroGoogle = async (req, res) => {
  const { supabaseId, email, nombres, apellidos } = req.body;

  try {
    // Buscar si el usuario ya existe
    let usuario = await prisma.usuario.findUnique({
      where: { supabaseId },
      include: { pasajero: true, conductor: true, administrador: true },
    });

    // Si no existe, crearlo con rol PASAJERO por defecto
    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          supabaseId,
          email,
          nombres: nombres || '',
          apellidos: apellidos || '',
          dni: '',                     // vacío, completar luego
          fechaNacimiento: new Date(), // placeholder, completar luego
          sexo: 'OTRO',
          rol: 'PASAJERO',
        },
      });

      // Crear perfil de pasajero
      await prisma.pasajero.create({
        data: { usuarioId: usuario.id },
      });

      // Volver a cargar con relaciones
      usuario = await prisma.usuario.findUnique({
        where: { id: usuario.id },
        include: { pasajero: true, conductor: true, administrador: true },
      });
    }

    res.json({ usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en registro con Google' });
  }
};

module.exports = { registro, login, recuperarPassword, registroGoogle };
