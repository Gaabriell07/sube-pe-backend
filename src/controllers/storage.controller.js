const { createClient } = require('@supabase/supabase-js');
const prisma = require('../lib/prisma');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─── SUBIR ARCHIVO ───────────────────────────────────────────────────────────
const subirArchivo = async (req, res) => {
  const { tipo } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const extension = req.file.originalname.split('.').pop();
    const nombreArchivo = `${req.usuario.id}/${tipo}-${Date.now()}.${extension}`;

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('subepe-archivos')
      .upload(nombreArchivo, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (error) return res.status(400).json({ error: error.message });

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('subepe-archivos')
      .getPublicUrl(nombreArchivo);

    // Guardar en base de datos
    const archivo = await prisma.archivo.create({
      data: {
        usuarioId: req.usuario.id,
        url: urlData.publicUrl,
        tipo,
      },
    });

    res.status(201).json({ mensaje: 'Archivo subido exitosamente', archivo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir archivo' });
  }
};

// ─── MIS ARCHIVOS ────────────────────────────────────────────────────────────
const getMisArchivos = async (req, res) => {
  try {
    const archivos = await prisma.archivo.findMany({
      where: { usuarioId: req.usuario.id },
      orderBy: { creadoEn: 'desc' },
    });
    res.json(archivos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener archivos' });
  }
};

// ─── ELIMINAR ARCHIVO ────────────────────────────────────────────────────────
const eliminarArchivo = async (req, res) => {
  const { id } = req.params;
  try {
    const archivo = await prisma.archivo.findUnique({ where: { id } });

    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado' });

    // Eliminar de Supabase Storage
    const path = archivo.url.split('subepe-archivos/')[1];
    await supabase.storage.from('subepe-archivos').remove([path]);

    // Eliminar de base de datos
    await prisma.archivo.delete({ where: { id } });

    res.json({ mensaje: 'Archivo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar archivo' });
  }
};

module.exports = { subirArchivo, getMisArchivos, eliminarArchivo };
