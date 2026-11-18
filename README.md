# Contador de novios

Sitio romántico en React para Adrian y Vale desde el 14 de noviembre de 2026 a las 23:55. Permite cambiar entre horas/minutos y años/meses/días, además de compartir recuerdos mediante una galería exportable.

Mensaje: **Mis dos neuronas y corazón son solo para ti**

## Ejecutar localmente

```sh
npm install
npm run dev
```

Abre la dirección que muestre Vite, normalmente `http://localhost:5173`.

## Recuerdos

Pulsa **Añadir recuerdos** para subir fotos. Las fotos se almacenan en IndexedDB en el navegador. No se suben a servidores ni se incluyen automáticamente en GitHub; estarán disponibles solo en el navegador donde las hayas añadido.

## Recuerdos compartidos

Pulsa **Añadir recuerdos** para subir fotos. Pulsa **Exportar galería** para descargar `photos.json`.

1. Coloca `photos.json` en la carpeta `public/` del proyecto, reemplazando el archivo vacío existente.
2. Ejecuta `npm run deploy` para publicar la galería en GitHub Pages.

Las fotos quedarán embebidas en `photos.json`, por lo que podrán verse desde cualquier dispositivo sin almacenamiento externo.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub.
2. Vincula y sube el proyecto:

```sh
git add .
git commit -m "Crear contador de novios"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

3. Ejecuta:

```sh
npm run deploy
```

4. En GitHub, abre **Settings > Pages** y selecciona la rama `gh-pages` como fuente.

La URL tendrá esta forma: `https://TU_USUARIO.github.io/TU_REPOSITORIO/`

## Fotos compartidas con Cloudinary

Las fotos se suben automáticamente a Cloudinary usando el cloud `nnolj1ci` y el preset unsigned `ml_default`.

El sitio crea un archivo público `nuestro-tiempo-gallery.json` con la lista de fotos. No es necesario activar **Resource List** ni compartir claves privadas.
