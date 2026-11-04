# ARIZA Joyas de Autor: sitio web

Tienda en HTML, CSS y JavaScript puros. No usa Shopify, WordPress ni frameworks, y no necesita compilarse: se puede alojar en cualquier hosting, incluido el Hostinger actual.

**El pago es una simulación.** Sigue la lógica del Sandbox de Wompi, pero no se conecta con Wompi ni realiza cobros.

## Cómo abrirlo

Desde esta carpeta:

```bash
python -m http.server 8321
```

Luego entra a `http://localhost:8321`.

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` + `js/home.js` | Inicio |
| `tienda.html` + `js/tienda.js` | Catálogo, filtros, orden, búsqueda y favoritos |
| `producto.html` + `js/producto.js` | Ficha de producto |
| `checkout.html` + `js/checkout.js` | Datos del comprador, entrega, cupón y pago |
| `respuesta.html` + `js/respuesta.js` | Página de regreso después de pagar |
| `contacto.html` | Formulario que abre WhatsApp con el mensaje listo |
| `politica-datos.html` | Política de datos, copiada de la web actual |
| `js/app.js` | Cabecera, pie, menú, carrito y paneles laterales |
| `js/config.js` | Tarifas, cupones y datos de la tienda |
| `data/catalogo.js` | Catálogo generado por `tools/actualizar_catalogo.py` |
| `js/wompi-sim.js` + `css/wompi-sim.css` | **Simulación** del widget de Wompi |
| `js/servidor-sim.js` | **Simulación** del backend: precios, firma y webhook |

Para actualizar el catálogo desde el WooCommerce actual:

```bash
python -I tools/actualizar_catalogo.py
```

## Datos de prueba del pago

Los mismos del Sandbox de Wompi. La ventana de pago tiene botones para llenarlos con un clic.

| Medio | Dato | Resultado |
|---|---|---|
| Tarjeta | `4242 4242 4242 4242` | Aprobada |
| Tarjeta | `4111 1111 1111 1111` | Rechazada |
| Tarjeta | Cualquier otra válida | Error |
| Nequi | `3991111111` | Aprobada |
| Nequi | `3992222222` | Rechazada |
| Nequi | Cualquier otro celular | Error |
| PSE | "Banco que aprueba" / "Banco que rechaza" | Según el banco |
| Botón Bancolombia | Se elige en la pantalla | Según lo elegido |
| Daviplata | Código `574829` | Aprobada |
| Daviplata | Código `932015` | Rechazada |
| Daviplata | Código `186743` | Rechazada, sin saldo |
| Daviplata | Código `999999` | Error |
| Daviplata | Otro código de 6 dígitos | Código inválido, permite reintentar |

Nunca escribas una tarjeta real en esta simulación. Los números de tarjeta no se guardan: de una transacción solo quedan la marca y los últimos 4 dígitos.

El cupón de ejemplo es `BIENVENIDA10`.

## Cómo pasar a Wompi real

El checkout ya usa la misma interfaz del widget oficial (`new WidgetCheckout({...}).open(callback)`), así que el navegador cambia poco. Lo nuevo es un backend, que hoy no existe.

**1. Crear un backend** con estos tres servicios:

| Servicio | Qué hace | Reemplaza a |
|---|---|---|
| `POST /api/pedidos` | Recalcula los precios y devuelve referencia, monto y firma | `ServidorSim.crearPedido` |
| `POST /api/wompi/eventos` | Recibe `transaction.updated`, valida el checksum y actualiza el pedido | `ServidorSim.recibirEvento` |
| `GET /api/transacciones/:id` | Consulta `GET /v1/transactions/{id}` con la llave privada | `WompiSim.obtenerTransaccion` |

- **Firma de integridad:** `SHA256(<Referencia><MontoEnCentavos><Moneda><SecretoIntegridad>)`
- **Checksum del evento:** valores de `signature.properties` + `timestamp` + secreto de eventos, en SHA256. Compáralo sin distinguir mayúsculas.
- **Respuesta al evento:** HTTP 200. Si no, Wompi reintenta hasta 3 veces en 24 horas.

**2. Cambiar el navegador:**

- En `checkout.html` y `respuesta.html`, quita `servidor-sim.js`, `wompi-sim.js` y `wompi-sim.css`.
- En `checkout.html`, carga `<script src="https://checkout.wompi.co/widget.js"></script>`.
- En `js/checkout.js`, llama a tu backend para `crearPedido` y `cotizar`. Hay un comentario donde va.
- En `js/respuesta.js`, llama a tu backend en lugar de `WompiSim`. También está marcado.
- En `checkout.html`, quita la barra "Modo demostración".

**3. Configurar Wompi:**

- En el panel de comercios, registra la URL de eventos, una por ambiente.
- En `js/config.js`, pon la llave pública. Usa `pub_test_` para probar y `pub_prod_` para vender.

Los secretos (`prv_`, `*_integrity_`, `*_events_`) deben quedarse en el servidor. Nunca van en el navegador.

Referencias: [Widget y Checkout Web](https://docs.wompi.co/docs/colombia/widget-checkout-web/), [Eventos](https://docs.wompi.co/docs/colombia/eventos/), [Ambientes y llaves](https://docs.wompi.co/docs/colombia/ambientes-y-llaves/), [Datos de prueba](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/).

## Antes de publicar

**Datos que debe confirmar ARIZA (`js/config.js`)**

- Tarifa de envío nacional: `$25.000` es un valor de ejemplo.
- Código de la cortesía del 10 %: `BIENVENIDA10` es de ejemplo.

**Textos de borrador**

- "Cuidado de tu joya", en la ficha de producto.
- El subtítulo del banner "Anillos de promesa", en la home.

**Conexiones pendientes**

- El boletín y la ventana del 10 % muestran confirmación, pero no guardan ni envían el correo.
- Los pedidos y transacciones viven en el navegador (`localStorage`) porque no hay servidor.

**Técnico**

- Las imágenes se cargan desde `arizajoyeria.com.co`. Si se reemplaza o apaga el WordPress actual, hay que migrarlas antes.
- Las páginas se generan con JavaScript. Para mejorar el SEO, conviene generar HTML estático por producto y colección.
- Canela Light es una fuente con licencia: el sitio usa Cormorant Garamond. Si ARIZA tiene la licencia, basta declararla con `@font-face`; ya es la primera opción en `--f-display`.
