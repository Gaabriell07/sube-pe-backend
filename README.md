# SubePE Backend

Este es el servicio backend para el sistema de transporte SubePE. Proporciona una API RESTful utilizando Express, se conecta a una base de datos PostgreSQL en Supabase a través de Prisma, y maneja la autenticación, geolocalización y la lógica general del negocio.

## Requisitos previos

- Node.js (se recomienda v18 o superior)
- npm o yarn

## Instrucciones de configuración

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Variables de entorno:
   Crea un archivo `.env` en el directorio raíz. Asegúrate de que las siguientes variables estén presentes (usa los valores de tu panel de Supabase):
   ```
   DATABASE_URL="postgresql://usuario:contraseña@host:puerto/basededatos"
   DIRECT_URL="postgresql://usuario:contraseña@host:puerto/basededatos"
   ```

3. Configuración de Base de Datos:
   Genera el cliente de Prisma para que la aplicación pueda comunicarse correctamente con la base de datos:
   ```bash
   npx prisma generate
   ```

4. Sembrar la Base de Datos (Opcional):
   Para poblar la base de datos con datos iniciales estándar (usuarios administradores, rutas base, etc.):
   ```bash
   npm run seed
   ```

## Ejecutar el servidor

- Modo de desarrollo (con recarga automática usando nodemon):
  ```bash
  npm run dev
  ```

- Modo de producción:
  ```bash
  npm start
  ```

Por defecto, el servidor se iniciará en el puerto 3000 (o en el puerto definido en tus variables de entorno).

## Estructura del Proyecto

- `src/` - Código fuente de la aplicación.
  - `controllers/` - Manejadores de peticiones y lógica de negocio.
  - `middlewares/` - Middlewares de Express (como validación de autenticación).
  - `routes/` - Definiciones de las rutas de la API.
  - `lib/` - Librerías compartidas e instancias (ej. Singleton de Prisma).
- `prisma/` - Esquema de la base de datos y archivos seed.

## Scripts disponibles

- `npm run dev`: Inicia el servidor en modo de desarrollo.
- `npm start`: Inicia el servidor en modo de producción.
- `npm run seed`: Ejecuta el script de siembra de la base de datos.
