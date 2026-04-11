const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  // ─── RUTA CPSA: Santa Rosa - Las Palmas ─────────────────────────────────
  // Primero verificamos si ya existe para no duplicar
  const rutaExiste = await prisma.ruta.findFirst({
    where: { nombre: { contains: 'Santa Rosa' } },
  });

  let ruta;
  if (!rutaExiste) {
    ruta = await prisma.ruta.create({
      data: {
        nombre: 'Santa Rosa - Las Palmas (CPSA)',
        paraderos: {
          create: [
            { nombre: 'SANTA ROSA',                orden: 1,  latitud: -11.870, longitud: -77.080 },
            { nombre: 'PROC. DE LA INDEPENDENCIA', orden: 2,  latitud: -11.985, longitud: -77.063 },
            { nombre: 'ACHO',                      orden: 3,  latitud: -12.040, longitud: -77.040 },
            { nombre: 'PIZARRO - CAQUETA',         orden: 4,  latitud: -12.050, longitud: -77.040 },
            { nombre: 'ALFONSO UGARTE',             orden: 5,  latitud: -12.060, longitud: -77.042 },
            { nombre: 'AV. BRASIL',                orden: 6,  latitud: -12.095, longitud: -77.050 },
            { nombre: 'AV. DEL EJERCITO',          orden: 7,  latitud: -12.110, longitud: -77.052 },
            { nombre: 'PARDO - MIRAFLORES',        orden: 8,  latitud: -12.123, longitud: -77.028 },
            { nombre: 'AV. BENAVIDES',             orden: 9,  latitud: -12.135, longitud: -77.012 },
            { nombre: 'TOMAS MARSANO',             orden: 10, latitud: -12.152, longitud: -76.992 },
            { nombre: 'SAN JUAN DE MIRAFLORES',    orden: 11, latitud: -12.170, longitud: -76.970 },
            { nombre: 'VILLA EL SALVADOR',         orden: 12, latitud: -12.218, longitud: -76.930 },
            { nombre: 'LAS PALMAS',                orden: 13, latitud: -12.275, longitud: -76.905 },
          ],
        },
      },
    });
    console.log('✅ Ruta CPSA creada:', ruta.id);
  } else {
    ruta = rutaExiste;
    console.log('ℹ️  Ruta CPSA ya existe:', ruta.id);
  }

  // ─── TARIFARIOS ─────────────────────────────────────────────────────────────
  // Solo 3 tipos de carnet pagan pasaje.
  // POLICIA, MILITAR, DISCAPACITADO, ADULTO_MAYOR → viaje GRATIS (sin tarifario)
  const tarifas = [
    { tipoCarnet: 'NORMAL',        precio: 2.00, descripcion: 'Tarifa regular' },
    { tipoCarnet: 'UNIVERSITARIO', precio: 1.50, descripcion: 'Tarifa universitaria' },
    { tipoCarnet: 'ESCOLAR',       precio: 1.00, descripcion: 'Tarifa escolar' },
  ];

  for (const tarifa of tarifas) {
    const existe = await prisma.tarifario.findFirst({
      where: { tipoCarnet: tarifa.tipoCarnet, activo: true },
    });
    if (!existe) {
      await prisma.tarifario.create({ data: tarifa });
      console.log(`✅ Tarifario creado: ${tarifa.tipoCarnet} → S/${tarifa.precio}`);
    } else {
      console.log(`ℹ️  Tarifario ya existe: ${tarifa.tipoCarnet}`);
    }
  }

  console.log('\n🎉 Seed completado exitosamente!');
  console.log(`📍 ID de la ruta CPSA: ${ruta.id}`);
  console.log('   Copia este ID si lo necesitas para pruebas.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
