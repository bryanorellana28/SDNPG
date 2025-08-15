# SDNPG

Aplicación web construida con [Next.js](https://nextjs.org/) y [Prisma](https://www.prisma.io/) sobre MySQL.

## Características

- Login con usuario por defecto `admin`/`admin`.
- Autenticación basada en JWT almacenado en cookie HTTP-only.
- Dashboard general accesible solo para usuarios autenticados.
- Estilos con [Bootstrap 5](https://getbootstrap.com/).

## Configuración

1. Copiar `.env.example` a `.env` y ajustar `DATABASE_URL` y `JWT_SECRET`.
2. Ejecutar las migraciones y generar el cliente de Prisma:
   ```bash
   npx prisma migrate dev
   ```
3. Sembrar el usuario administrador:
   ```bash
   npm run seed
   ```
4. Iniciar la aplicación:
   ```bash
   npm run dev
   ```

## Rutas

- `/` formulario de login.
- `/dashboard` panel general (protegido).

