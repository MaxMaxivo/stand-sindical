# Comprobación de esta versión

10/10/2026:

- Controles de datos: único precio confirmado $10.000, Búfalo 3D en 0, 18 remeras unisex sin repartir por talle, demás fichas con precio y stock pendientes.
- 13 fechas importadas de la agenda: 9 con fecha completa y 4 con año pendiente.
- Flujo en la vista móvil: dos búfalos azules + una remera de obsequio; total $20.000; confirmación por transferencia; show Los años locos, Alimmé, 15/10/2026 presente en historial.
- Deshacer devuelve los artículos al carrito y elimina esa confirmación. Luego se deshicieron las incorporaciones de prueba; el historial quedó vacío.
- Reapertura con el servidor local detenido: app y siete imágenes cargadas desde la caché.
- Vista móvil de 390 píxeles: contenido sin desbordamiento horizontal y todas las imágenes cargadas.
- CSV: contenido, referencia de show y tratamiento de notas comprobados por los controles de lógica. El navegador integrado no confirmó el evento de descarga durante la prueba; la descarga de archivo en ese navegador queda pendiente de comprobación.
- Resguardo en Supabase: migracion aplicada con exito en `stand-sindical`, referencia `qgxwhcwvlgsafffajyxj`. Usuario del stand creado por el usuario. Registro publico y acceso anonimo deshabilitados. La lectura real sin ingreso fue rechazada con HTTP 401 y permiso denegado. La prueba de envio de una copia real queda pendiente del ingreso del usuario; no se accedio a su contrasena.
- GitHub: repositorio `https://github.com/MaxMaxivo/stand-sindical` creado y archivos separados importados con exito. Cambio a publico autorizado expresamente por el usuario.
- GitHub Pages: fuente `GitHub Actions`; publicacion exitosa en `https://maxmaxivo.github.io/stand-sindical/`. Las pruebas y el build tambien pasaron en GitHub Actions.
- Flujo real en la URL publicada: dos bufalos azules y una remera de obsequio, total $20.000, show Los anos locos del 15/10/2026, pago por transferencia e historial comprobados. Se deshicieron la venta, el show y los agregados de prueba; historial y carrito quedaron vacios.
- URL publicada: siete tarjetas con imagen cargada, vista movil sin desbordamiento horizontal, indicador `Offline listo` y sin errores registrados en la consola. El test con la conexion cortada fue local, no en el alojamiento de GitHub.
- Acceso por enlace de correo: agregado sin habilitar altas de usuarios. Validacion de identidad contra Auth antes de aceptar la sesion, credenciales solo en memoria y limpieza del fragmento de la direccion. Pruebas simuladas de enlace valido, vencido, tipo incorrecto y token rechazado. La entrega del correo y la copia real aun requieren comprobacion del usuario.
