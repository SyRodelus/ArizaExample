// Página de regreso desde Wompi (redirect-url?id=...). Es informativa: el estado real del pedido
// lo fija el evento transaction.updated, tal como indica la documentación de Wompi.
(function () {
  'use strict';
  const { CFG, $, esc, precio, icono, enlaceWhatsapp, vaciarCarrito, almacen } = window.Ariza;
  const raiz = $('#resultado');
  const id = new URLSearchParams(location.search).get('id');
  // En producción: fetch(`/api/transacciones/${id}`), que consulta GET /v1/transactions/{id} con la llave privada.
  const tx = id ? window.WompiSim.obtenerTransaccion(id) : null;

  if (!tx) {
    raiz.innerHTML = `<div class="resultado__cabeza"><h1 class="resultado__titulo">No encontramos este pago</h1><p class="resultado__texto">Si crees que es un error, escríbenos por WhatsApp.</p><div class="resultado__botones"><a class="btn" href="tienda.html">Ver catálogo</a></div></div>`;
    return;
  }

  const pedido = window.ServidorSim.obtenerPedido(tx.reference);
  const aprobado = pedido?.estado === 'PAGADO' && tx.status === 'APPROVED';
  const pendiente = tx.status === 'PENDING';
  const primerNombre = pedido?.cliente?.nombre?.split(' ')[0] || '';

  // Un pago aprobado vacía el carrito una sola vez, aunque se recargue la página.
  if (aprobado) {
    const atendidas = almacen.leer('ariza_pagos_atendidos', []);
    if (!atendidas.includes(tx.id)) {
      vaciarCarrito();
      almacen.guardar('ariza_pagos_atendidos', [...atendidas, tx.id]);
    }
  }

  const VISTA = aprobado
    ? { clase: '', icono: 'check', titulo: `¡Gracias${primerNombre ? `, ${primerNombre}` : ''}! Tu pago fue aprobado`, texto: 'Recibimos tu pedido y empezaremos a prepararlo. Te escribiremos con los detalles.' }
    : pendiente
      ? { clase: 'resultado__icono--pendiente', icono: 'espera', titulo: 'Tu pago está en proceso', texto: 'Te avisaremos cuando se confirme. No es necesario que pagues de nuevo.' }
      : { clase: 'resultado__icono--mal', icono: 'alerta', titulo: tx.status === 'DECLINED' ? 'Tu pago fue rechazado' : 'No pudimos procesar tu pago', texto: `${tx.status_message || ''} Tu carrito sigue guardado para que lo intentes de nuevo.` };

  const entregaTexto = !pedido ? '' : pedido.entrega === 'digital'
    ? 'Tu bono llegará por WhatsApp al celular que indicaste.'
    : pedido.entrega === 'tienda'
      ? `Te avisaremos cuando esté listo para recoger en ${CFG.tienda.direccion}.`
      : `Llegará a ${[pedido.direccion?.linea, pedido.direccion?.ciudad].filter(Boolean).join(', ')} en ${CFG.envio.plazo}.`;

  const articulos = pedido ? pedido.detalle.map((d) => `<div><dt>${esc(d.nombre)}${d.variante ? ` · ${esc(d.variante)}` : ''} × ${d.q}</dt><dd>${precio(d.precio * d.q)}</dd></div>`).join('') : '';

  raiz.innerHTML = `
    <div class="resultado__cabeza">
      <span class="resultado__icono ${VISTA.clase}">${icono(VISTA.icono)}</span>
      <h1 class="resultado__titulo">${esc(VISTA.titulo)}</h1>
      <p class="resultado__texto">${esc(VISTA.texto)}</p>
    </div>
    <div class="resultado__caja">
      <dl class="resultado__datos">
        <div><dt>Referencia del pedido</dt><dd>${esc(tx.reference)}</dd></div>
        <div><dt>Transacción Wompi (simulada)</dt><dd>${esc(tx.id)}</dd></div>
        <div><dt>Medio de pago</dt><dd>${esc(window.WompiSim.NOMBRE_METODO[tx.payment_method_type] || tx.payment_method_type)}${tx.payment_method?.extra?.last_four ? ` ···· ${esc(tx.payment_method.extra.last_four)}` : ''}</dd></div>
        <div><dt>Estado</dt><dd>${esc(tx.status)}</dd></div>
        <div><dt>Total</dt><dd>${precio(tx.amount_in_cents / 100)} ${esc(tx.currency)}</dd></div>
      </dl>
      ${pedido ? `<h2 class="resultado__h">Tu pedido</h2><dl class="resultado__datos">${articulos}
        ${pedido.descuento ? `<div><dt>Descuento</dt><dd>−${precio(pedido.descuento)}</dd></div>` : ''}
        ${pedido.entrega === 'digital' ? '' : `<div><dt>Envío</dt><dd>${pedido.envio ? precio(pedido.envio) : 'Gratis'}</dd></div>`}
      </dl>` : ''}
      ${aprobado && entregaTexto ? `<h2 class="resultado__h">Entrega</h2><p>${esc(entregaTexto)}</p>` : ''}
    </div>
    <div class="resultado__botones">
      ${aprobado
        ? `<a class="btn btn--lleno" href="tienda.html">Seguir comprando</a><a class="btn" href="${enlaceWhatsapp(`¡Hola ARIZA! Quiero información de mi pedido ${tx.reference}.`)}" target="_blank" rel="noopener">Consultar por WhatsApp</a>`
        : pendiente
          ? `<a class="btn" href="${enlaceWhatsapp(`¡Hola ARIZA! Mi pago ${tx.reference} sigue en proceso.`)}" target="_blank" rel="noopener">Consultar por WhatsApp</a>`
          : `<a class="btn btn--lleno" href="checkout.html">Intentar de nuevo</a><a class="btn" href="${enlaceWhatsapp(`¡Hola ARIZA! Tuve un problema al pagar mi pedido ${tx.reference}.`)}" target="_blank" rel="noopener">Pedir ayuda por WhatsApp</a>`}
    </div>
    <p class="contacto__nota" style="text-align:center;margin-top:24px">Demostración: este pago fue simulado y no se realizó ningún cobro.</p>`;
})();
