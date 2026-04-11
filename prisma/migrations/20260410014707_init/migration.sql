-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('PASAJERO', 'CONDUCTOR', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoCarnet" AS ENUM ('NORMAL', 'UNIVERSITARIO', 'ESCOLAR', 'POLICIA', 'MILITAR', 'ADULTO_MAYOR', 'DISCAPACITADO');

-- CreateEnum
CREATE TYPE "EstadoViaje" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'PENALIZADO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'COMPLETADO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "EstadoConductor" AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pasajero" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipoCarnet" "TipoCarnet" NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "Pasajero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conductor" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" "EstadoConductor" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "Conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Administrador" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,

    CONSTRAINT "Administrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Archivo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Archivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidad" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadConductor" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnidadConductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Ruta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paradero" (
    "id" TEXT NOT NULL,
    "rutaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "Paradero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarifario" (
    "id" TEXT NOT NULL,
    "tipoCarnet" "TipoCarnet" NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarifario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viaje" (
    "id" TEXT NOT NULL,
    "pasajeroId" TEXT NOT NULL,
    "conductorId" TEXT,
    "unidadId" TEXT,
    "rutaId" TEXT NOT NULL,
    "paraderoInicio" TEXT NOT NULL,
    "paraderoFin" TEXT NOT NULL,
    "qrCodigo" TEXT NOT NULL,
    "estado" "EstadoViaje" NOT NULL DEFAULT 'PENDIENTE',
    "montoDescontado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "escaneadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrEscaneo" (
    "id" TEXT NOT NULL,
    "qrCodigo" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "exitoso" BOOLEAN NOT NULL,
    "escaneadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrEscaneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penalidad" (
    "id" TEXT NOT NULL,
    "pasajeroId" TEXT NOT NULL,
    "viajeId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Penalidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recompensa" (
    "id" TEXT NOT NULL,
    "pasajeroId" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recompensa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recarga" (
    "id" TEXT NOT NULL,
    "pasajeroId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoSueldo" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "administradorId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoSueldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comunicado" (
    "id" TEXT NOT NULL,
    "administradorId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comunicado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_supabaseId_key" ON "Usuario"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_dni_key" ON "Usuario"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Pasajero_usuarioId_key" ON "Pasajero"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Conductor_usuarioId_key" ON "Conductor"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Administrador_usuarioId_key" ON "Administrador"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_placa_key" ON "Unidad"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "Viaje_qrCodigo_key" ON "Viaje"("qrCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "Penalidad_viajeId_key" ON "Penalidad"("viajeId");

-- AddForeignKey
ALTER TABLE "Pasajero" ADD CONSTRAINT "Pasajero_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conductor" ADD CONSTRAINT "Conductor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Administrador" ADD CONSTRAINT "Administrador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archivo" ADD CONSTRAINT "Archivo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadConductor" ADD CONSTRAINT "UnidadConductor_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadConductor" ADD CONSTRAINT "UnidadConductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paradero" ADD CONSTRAINT "Paradero_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "Ruta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_pasajeroId_fkey" FOREIGN KEY ("pasajeroId") REFERENCES "Pasajero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "Ruta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penalidad" ADD CONSTRAINT "Penalidad_pasajeroId_fkey" FOREIGN KEY ("pasajeroId") REFERENCES "Pasajero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penalidad" ADD CONSTRAINT "Penalidad_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "Viaje"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recompensa" ADD CONSTRAINT "Recompensa_pasajeroId_fkey" FOREIGN KEY ("pasajeroId") REFERENCES "Pasajero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recarga" ADD CONSTRAINT "Recarga_pasajeroId_fkey" FOREIGN KEY ("pasajeroId") REFERENCES "Pasajero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoSueldo" ADD CONSTRAINT "PagoSueldo_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoSueldo" ADD CONSTRAINT "PagoSueldo_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "Administrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comunicado" ADD CONSTRAINT "Comunicado_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "Administrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
