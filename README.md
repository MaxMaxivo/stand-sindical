# Stand Sindical

App web móvil base para registrar movimientos de merchandising del stand.

## Abrir la app

Version publicada: https://maxmaxivo.github.io/stand-sindical/

Para usarla en el celular, abri esa direccion con internet al menos una vez y espera que aparezca `Offline listo`. La venta no requiere contrasena. El acceso de usuario se usa solo en `Resguardo` para enviar una copia privada a Supabase.

La app está en `index.html`. Para probarla en la computadora, abrí:

`outputs/stand-sindical/index.html`

Para probar la app y el modo offline en la computadora, usá Node. No requiere instalar paquetes. Desde la carpeta `stand-sindical`:

```powershell
node server.mjs
```

Después abrí `http://127.0.0.1:8080`. Si el puerto está ocupado, en PowerShell ejecutá `$env:STAND_PORT = '8081'` antes de iniciar.

En el celular, la publicación debe usar HTTPS para instalar la app y habilitar la caché offline. `file://` permite probar la pantalla, pero no instala el modo offline. HTTP con la IP de la computadora tampoco habilita el service worker en el celular. La app guarda movimientos en el navegador de ese dispositivo; no sincroniza entre celulares o computadoras.

## Cambiar productos, precios o stock

Editá `assets/data/products.js`.

- `price`: precio en pesos, o `null` si todavía está pendiente.
- `startingStock`: stock base conocido, o `null` si requiere conciliación.
- `countedTotal`: conteo total cuando existe, pero no está separado con certeza por variantes.
- `variantGroups`: colores, talles, diseños u otras variantes.

Datos cargados ahora:

- Búfalo 3D: $10.000, stock actual 0. Se dejó registrado que ya hubo 9 negros vendidos, 5 azules vendidos y 1 azul regalado.
- Remera unisex: 18 contadas por diseño; precio, variantes y talles quedan para conciliación.
- Otros productos: placeholder para completar cuando haya datos.
- Musculosa barquito, lámina Zájaros, Hotel de canciones y Subtitulado: imágenes tomadas de la tienda oficial, con precio y stock pendientes. La musculosa es una ficha separada, no consume el conteo de 18 remeras unisex.

## Cambiar imágenes

Las imágenes están en `assets/images/`.

Podés reemplazar un SVG por una foto `.jpg` o `.png`. Si cambiás el nombre del archivo, actualizá `assets/data/images.js` en el campo `src`.

Si agregás una imagen nueva, agregá su ruta a `ASSETS` en `service-worker.js` y aumentá la versión de `CACHE_NAME` para renovar las copias offline después de publicar.

También aumentá `CACHE_NAME` después de cambiar precios, agenda, lógica o estilos: así la próxima visita con conexión recibe la versión nueva.

## Shows

Elegí el show en el selector superior. Se conserva en este navegador y queda copiado en cada movimiento confirmado; cambiar de show después no cambia ventas anteriores. También aparece en el historial y en el CSV.

Editá `assets/data/shows.js` para actualizar la agenda. Incluye 13 fechas consultadas el 10/10/2026: 9 con año 2026 y 4 de enero con año pendiente. En estas últimas no se inventa una fecha completa. Las fuentes se detallan en `FUENTES.md`.

## Uso básico

1. Tocá una tarjeta de producto.
2. Elegí variante y cantidad.
3. Marcá `Obsequio` si corresponde.
4. Agregá al carrito.
5. Confirmá el movimiento con el medio de pago.
6. Exportá CSV desde `Historial` o `Stock`.

El botón `↶` deshace la última acción: agregar, quitar, modificar cantidades, vaciar carrito o confirmar una venta.

## Resguardo y Supabase

En `Resguardo`, `Descargar copia` exporta los datos de este navegador en JSON. Guardar en Supabase requiere conexión, proyecto configurado y acceso de usuario. La copia incluye los movimientos actuales, carrito, show y catálogo; cada envío crea una nueva copia privada. No combina movimientos de dispositivos ni restaura datos automáticamente. Deshacer después de enviar una copia cambia los datos locales; enviá una copia nueva para guardar ese cambio.

Proyecto conectado: `stand-sindical`, referencia `qgxwhcwvlgsafffajyxj`. La tabla de resguardos y sus permisos privados ya fueron creados. La configuracion solo contiene la URL y una clave publicable, no contrasenas ni claves secretas.

Para otro proyecto, o para revisar la configuracion:

1. Crear un proyecto Supabase y aplicar `supabase/migrations/202610100001_backups.sql` una sola vez.
2. Crear el usuario del stand en Authentication. No hay formulario de registro público en la app.
3. Completar `supabaseUrl` y `supabasePublishableKey` en `assets/data/config.js` con la URL del proyecto y su clave publicable o `anon`. Nunca usar una clave `service_role` o secreta.
4. Publicar y probar ingreso y copia. La tabla tiene permisos por usuario: cada uno puede leer y agregar únicamente sus copias. No admite actualización ni borrado desde la app.

La venta local funciona sin ingresar a Supabase. Para guardar una copia, usá el email y la contrasena del usuario del stand creado en Authentication, no la contrasena de la base de datos. La sesión de acceso se mantiene en memoria y se vuelve a ingresar al recargar.

Si no tenes esa contrasena, completa solo `Correo` y toca `Enviar enlace de acceso`. Supabase envia un enlace de un solo uso a la cuenta existente. Abrilo en tu correo: vuelve a la app publicada y habilita `Guardar copia en Supabase`. No compartas el enlace ni su direccion. El registro de nuevas cuentas sigue cerrado. La URL de sitio de Authentication debe ser `https://maxmaxivo.github.io/stand-sindical/`. Los envios de correo estan sujetos a los limites y permisos del servicio de correo de Supabase.

Cambiar de `file://` a la vista previa o a una URL publicada abre un almacenamiento diferente. Antes de cambiar la dirección usada en el stand, descargá una copia de los movimientos del navegador original. La importación/restauración de copias todavía no está implementada.

## GitHub y publicación

La carpeta completa es la raíz del repositorio nuevo `stand-sindical`. Incluye `.github/workflows/pages.yml` para publicar con GitHub Pages. Configurar Pages con fuente `GitHub Actions` en el repositorio. La publicación web se prepara en `dist/` y solo incluye la app y sus recursos. Los movimientos reales se guardan en el navegador y no se agregan al repositorio.

Repositorio: https://github.com/MaxMaxivo/stand-sindical . Se hizo publico con autorizacion del usuario para utilizar GitHub Pages gratis. La fuente de Pages quedo configurada como `GitHub Actions` y la publicacion inicial fue exitosa. Los datos iniciales del catalogo son publicos; los movimientos nuevos permanecen en cada navegador y las copias de Supabase requieren ingreso.

## Comprobar

```powershell
node scripts/check.mjs
node scripts/build.mjs
```

Los controles cubren venta con obsequio, precio pendiente, stock, asignación de show, CSV, undo, archivos offline y la comunicación de resguardo con respuestas simuladas. Tambien se comprobo el flujo de venta y deshacer en la URL publicada. Supabase ya esta configurado y rechaza la lectura sin ingreso. El acceso por correo incluye pruebas simuladas de verificacion de identidad, enlaces vencidos y tokens rechazados. La entrega del correo y el envio de una copia real siguen pendientes del ingreso del usuario del stand.
