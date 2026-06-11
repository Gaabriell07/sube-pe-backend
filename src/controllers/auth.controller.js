const { createClient } = require('@supabase/supabase-js');
const prisma = require('../lib/prisma');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const registro = async (req, res) => {
  const { email, password, nombres, apellidos, dni, fechaNacimiento, sexo, rol } = req.body;

  try {
    
    if (dni) {
      const dniExistente = await prisma.usuario.findFirst({ where: { dni } });
      if (dniExistente) {
        return res.status(400).json({
          error: 'Este DNI ya está en uso',
          mensaje: 'El número de documento ya está registrado. Si ya tienes una cuenta, inicia sesión.',
        });
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

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
        rol,
      },
    });

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

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(400).json({ error: error.message });

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

const registroGoogle = async (req, res) => {
  const { supabaseId, email, nombres, apellidos } = req.body;

  try {
    
    let usuario = await prisma.usuario.findUnique({
      where: { supabaseId },
      include: { pasajero: true, conductor: true, administrador: true },
    });

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

      await prisma.pasajero.create({
        data: { usuarioId: usuario.id },
      });

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
