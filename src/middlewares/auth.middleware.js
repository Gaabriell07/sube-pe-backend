const { createClient } = require('@supabase/supabase-js');
const prisma = require('../lib/prisma'); // ← usa el singleton, no crea otro PrismaClient

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const verificarToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    // Verificar token con Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Obtener usuario de nuestra BD (usando el singleton compartido)
    const usuario = await prisma.usuario.findUnique({
      where: { supabaseId: data.user.id },
      include: {
        pasajero:       true,
        conductor:      true,
        administrador:  true,
      },
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Error al verificar token' });
  }
};

const soloRol = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esto' });
    }
    next();
  };
};

module.exports = { verificarToken, soloRol };
