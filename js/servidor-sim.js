// SIMULACIÓN DEL BACKEND DE ARIZA.
// En producción todo esto vive en un servidor: los secretos NUNCA deben llegar al navegador.
// Aquí corre en el navegador solo porque esta entrega es una demostración sin servidor.
(function () {
  'use strict';
  const { CFG, porId, precioLinea, etiquetaVariante, almacen } = window.Ariza;

  const SECRETO_INTEGRIDAD = 'test_integrity_ARIZA_SIMULADO';
  const SECRETO_EVENTOS = 'test_events_ARIZA_SIMULADO';
  const CLAVE_PEDIDOS = 'ariza_pedidos';

  function sha256(texto) {
    const rotar = (x, n) => (x >>> n) | (x << (32 - n));
    const primos = [];
    for (let c = 2; primos.length < 64; c++) if (primos.every((p) => c % p)) primos.push(c);
    const fraccion = (x, e) => ((Math.pow(x, e) % 1) * 4294967296) >>> 0;
    const K = primos.map((p) => fraccion(p, 1 / 3));
    let H = primos.slice(0, 8).map((p) => fraccion(p, 1 / 2));
    const datos = new TextEncoder().encode(texto);
    const largo = datos.length;
    const bloque = new Uint8Array(((largo + 9 + 63) >> 6) << 6);
    bloque.set(datos);
    bloque[largo] = 0x80;
    const vista = new DataView(bloque.buffer);
    vista.setUint32(bloque.length - 8, Math.floor(largo / 536870912), false);
    vista.setUint32(bloque.length - 4, (largo * 8) >>> 0, false);
    const w = new Array(64);
    for (let i = 0; i < bloque.length; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = vista.getUint32(i + t * 4, false);
      for (let t = 16; t < 64; t++) {
        const s0 = rotar(w[t - 15], 7) ^ rotar(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotar(w[t - 2], 17) ^ rotar(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotar(e, 6) ^ rotar(e, 11) ^ rotar(e, 25);
        const T1 = (h + S1 + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
        const S0 = rotar(a, 2) ^ rotar(a, 13) ^ rotar(a, 22);
        const T2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + T1) | 0; d = c; c = b; b = a; a = (T1 + T2) | 0;
      }
      H = [H[0] + a, H[1] + b, H[2] + c, H[3] + d, H[4] + e, H[5] + f, H[6] + g, H[7] + h].map((x) => x | 0);
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  // El servidor recalcula los precios con el catálogo: nunca confía en montos del navegador.
  function cotizar(lineas, { entrega = 'domicilio', cupon = '' } = {}) {
    const detalle = lineas.map((l) => {
      const p = porId.get(l.id);
      return { id: l.id, v: l.v || null, q: l.q, nombre: p.n, variante: etiquetaVariante(l), precio: precioLinea(l), digital: !!p.digital };
    });
    const subtotal = detalle.reduce((s, d) => s + d.precio * d.q, 0);
    const descontable = detalle.filter((d) => !d.digital).reduce((s, d) => s + d.precio * d.q, 0);
    const codigo = cupon.trim().toUpperCase();
    const datosCupon = CFG.cupones[codigo];
    const descuento = datosCupon ? Math.round((descontable * datosCupon.porcentaje) / 100) : 0;
    const soloDigital = detalle.length > 0 && detalle.every((d) => d.digital);
    const trasDescuento = subtotal - descuento;
    const envioGratis = soloDigital || entrega === 'tienda' || trasDescuento >= CFG.envio.gratisDesde;
    const envio = envioGratis ? 0 : CFG.envio.costoNacional;
    return { detalle, subtotal, descuento, cupon: datosCupon ? codigo : null, envio, total: trasDescuento + envio, soloDigital };
  }

  // Firma de integridad de Wompi: SHA256(<Referencia><Monto><Moneda><SecretoIntegridad>)
  const firmar = (referencia, montoEnCentavos, moneda) => sha256(`${referencia}${montoEnCentavos}${moneda}${SECRETO_INTEGRIDAD}`);

  const leerPedidos = () => almacen.leer(CLAVE_PEDIDOS, {});
  function guardarPedido(pedido) {
    const pedidos = leerPedidos();
    pedidos[pedido.referencia] = pedido;
    almacen.guardar(CLAVE_PEDIDOS, pedidos);
  }

  function crearPedido({ lineas, cliente, entrega, direccion, cupon, notas }) {
    const cotizacion = cotizar(lineas, { entrega, cupon });
    const azar = Math.random().toString(36).slice(2, 6).toUpperCase();
    const referencia = `ARZ-${Date.now().toString(36).toUpperCase()}-${azar}`;
    const montoEnCentavos = cotizacion.total * 100;
    guardarPedido({
      referencia, estado: 'PENDIENTE_PAGO', creado: new Date().toISOString(),
      cliente, entrega: cotizacion.soloDigital ? 'digital' : entrega, direccion, notas, ...cotizacion
    });
    return { referencia, moneda: CFG.moneda, montoEnCentavos, firma: firmar(referencia, montoEnCentavos, CFG.moneda) };
  }

  const ESTADOS_PEDIDO = { APPROVED: 'PAGADO', DECLINED: 'PAGO_RECHAZADO', ERROR: 'PAGO_CON_ERROR', VOIDED: 'PAGO_ANULADO', PENDING: 'PENDIENTE_PAGO' };

  // Equivale a la URL de eventos del comercio. La redirección es informativa:
  // el estado del pedido solo cambia aquí, tras validar el checksum.
  function recibirEvento(evento) {
    const valor = (ruta) => ruta.split('.').reduce((o, k) => o?.[k], evento.data);
    const cadena = evento.signature.properties.map(valor).join('') + evento.timestamp + SECRETO_EVENTOS;
    if (sha256(cadena).toLowerCase() !== String(evento.signature.checksum).toLowerCase()) {
      console.warn('[Wompi simulado] Evento rechazado: checksum inválido', evento);
      return { status: 400 };
    }
    const t = evento.data.transaction;
    const pedidos = leerPedidos();
    const pedido = pedidos[t.reference];
    if (pedido && pedido.total * 100 === t.amount_in_cents) {
      pedido.estado = ESTADOS_PEDIDO[t.status] || pedido.estado;
      pedido.transaccion = t.id;
      guardarPedido(pedido);
    }
    console.info('[Wompi simulado] Evento recibido', evento);
    return { status: 200 };
  }

  window.ServidorSim = {
    sha256, cotizar, crearPedido, firmar, recibirEvento,
    obtenerPedido: (referencia) => leerPedidos()[referencia] || null,
    // Solo para que wompi-sim.js pueda firmar eventos: en la realidad cada secreto vive en un servidor distinto.
    _secretoEventos: SECRETO_EVENTOS
  };
})();
