# SDNPG

Aplicación web construida con [Next.js](https://nextjs.org/) y [Prisma](https://www.prisma.io/) sobre MySQL.

## Características

- Usuarios con roles `ADMIN` y `OPERATOR`.
- Login con credenciales por defecto `admin`/`admin` y `operator`/`operator`.
- Autenticación basada en JWT almacenado en cookie HTTP-only.
- Dashboard general accesible solo para usuarios autenticados.
- Estilos con [Bootstrap 5](https://getbootstrap.com/).

## Configuración

1. Copiar `.env.example` a `.env` y ajustar `DATABASE_URL` y `JWT_SECRET`.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Generar el cliente de Prisma:
   ```bash
   npx prisma generate
   ```
4. Crear las tablas de la base de datos:
   ```bash
   npx prisma db push
   ```
5. Sembrar usuarios iniciales (administrador y operador):
   ```bash
   npm run seed
   ```
6. Iniciar la aplicación en modo desarrollo:
   ```bash
   npm run dev
   ```

## Rutas

- `/` formulario de login.
- `/dashboard` panel general (protegido).

