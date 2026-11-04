// SIMULACIÓN del widget de Wompi (https://checkout.wompi.co/widget.js).
// Misma interfaz: new WidgetCheckout({...}).open(callback). Sigue la tabla de datos de prueba del
// Sandbox de Wompi. No se comunica con Wompi, no realiza cobros y nunca guarda números de tarjeta.
(function () {
  'use strict';

  const CLAVE_TX = 'wompi_sim_transacciones';
  const { almacen, $, $$, esc, precio, atraparFoco, icono } = window.Ariza;
  const { sha256, recibirEvento, firmar, _secretoEventos } = window.ServidorSim;

  const leerTx = () => almacen.leer(CLAVE_TX, {});
  function guardarTx(tx) {
    const todas = leerTx();
    todas[tx.id] = tx;
    almacen.guardar(CLAVE_TX, todas);
  }
  const ahora = () => new Date().toISOString();
  const nuevoId = () => `${1000 + Math.floor(Math.random() * 9000)}-${Math.floor(Date.now() / 1000)}-${10000 + Math.floor(Math.random() * 90000)}`;

  const METODOS = [
    { id: 'CARD', nombre: 'Tarjeta de crédito o débito', detalle: 'Visa, Mastercard, American Express' },
    { id: 'PSE', nombre: 'PSE', detalle: 'Débito desde tu cuenta bancaria' },
    { id: 'NEQUI', nombre: 'Nequi', detalle: 'Confirma desde tu celular' },
    { id: 'BANCOLOMBIA_TRANSFER', nombre: 'Botón Bancolombia', detalle: 'Transferencia desde tu cuenta' },
    { id: 'DAVIPLATA', nombre: 'Daviplata', detalle: 'Confirma con un código de seguridad' }
  ];
  const NOMBRE_METODO = Object.fromEntries(METODOS.map((m) => [m.id, m.nombre]));
  const MENSAJES = {
    APPROVED: ['Transacción aprobada', 'Tu pago se procesó correctamente.'],
    DECLINED: ['Transacción rechazada', 'El medio de pago rechazó la transacción. No se realizó ningún cobro.'],
    ERROR: ['Error en la transacción', 'No se pudo procesar el pago. No se realizó ningún cobro.'],
    PENDING: ['Transacción pendiente', 'Tu pago sigue en proceso.']
  };

  const luhn = (n) => {
    let suma = 0;
    [...n].reverse().forEach((d, i) => {
      let v = Number(d);
      if (i % 2) { v *= 2; if (v > 9) v -= 9; }
      suma += v;
    });
    return suma % 10 === 0;
  };
  const marcaTarjeta = (n) => (n.startsWith('4') ? 'VISA' : /^5[1-5]/.test(n) ? 'MASTERCARD' : /^3[47]/.test(n) ? 'AMEX' : 'TARJETA');
  const enmascarar = (tel) => `${tel.slice(0, 3)}****${tel.slice(-3)}`;

  class SesionPago {
    constructor(cfg, callback) {
      this.cfg = cfg;
      this.callback = callback;
      this.bloqueado = false;
      this.tx = null;
    }

    iniciar() {
      const c = this.cfg;
      const monto = precio(c.amountInCents / 100);
      document.body.insertAdjacentHTML('beforeend', `
        <div class="wsim" id="wsim" role="dialog" aria-modal="true" aria-label="Pago con Wompi, simulación">
          <div class="wsim__caja">
            <div class="wsim__cinta">SIMULACIÓN · NO SE REALIZA NINGÚN COBRO</div>
            <header class="wsim__cabeza">
              <div>
                <p class="wsim__marca">wompi <span>sandbox simulado</span></p>
                <p class="wsim__comercio">ARIZA Joyas de Autor</p>
              </div>
              <button class="wsim__cerrar" type="button" aria-label="Cerrar pago">${icono('cerrar')}</button>
            </header>
            <div class="wsim__monto"><span>Total a pagar</span><strong>${monto} ${esc(c.currency)}</strong><small>Referencia: ${esc(c.reference)}</small></div>
            <div class="wsim__cuerpo" id="wsim-cuerpo"></div>
          </div>
        </div>`);
      this.raiz = $('#wsim');
      this.cuerpo = $('#wsim-cuerpo');
      document.body.classList.add('sin-scroll');
      $('.wsim__cerrar', this.raiz).addEventListener('click', () => this.salir());
      this.raiz.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.salir();
        atraparFoco(e, this.raiz);
      });
      const error = this.validar();
      if (error) this.pantallaFalla(error); else this.pantallaMetodos();
    }

    validar() {
      const c = this.cfg;
      for (const campo of ['currency', 'amountInCents', 'reference', 'publicKey']) {
        if (!c[campo]) return `Falta el parámetro obligatorio "${campo}".`;
      }
      if (!Number.isInteger(c.amountInCents) || c.amountInCents <= 0) return 'El monto debe ser un entero positivo en centavos.';
      if (!/^pub_(test|prod)_/.test(c.publicKey)) return 'La llave pública no tiene un formato válido.';
      if (c.signature?.integrity !== firmar(c.reference, c.amountInCents, c.currency)) return 'La firma de integridad no es válida.';
      return null;
    }

    pintar(html, foco = true) {
      this.cuerpo.innerHTML = html;
      this.cuerpo.scrollTop = 0;
      if (foco) (this.cuerpo.querySelector('input, select, button') || $('.wsim__cerrar', this.raiz)).focus();
    }

    /* ---------- Pantallas ---------- */
    pantallaMetodos() {
      this.pintar(`
        <h2 class="wsim__titulo">Elige cómo pagar</h2>
        <div class="wsim__metodos">
          ${METODOS.map((m) => `<button class="wsim__metodo" type="button" data-metodo="${m.id}"><span><strong>${m.nombre}</strong><small>${m.detalle}</small></span>${icono('derecha')}</button>`).join('')}
        </div>
        <label class="wsim__terminos"><input type="checkbox" id="wsim-terminos" ${this.aceptado ? 'checked' : ''}><span>Acepto los términos y condiciones de la pasarela para realizar este pago (simulado).</span></label>
        <p class="wsim__error" id="wsim-error" role="alert" hidden>Acepta los términos para continuar.</p>`, false);
      $('.wsim__cerrar', this.raiz).focus();
      $('#wsim-terminos').addEventListener('change', (e) => { this.aceptado = e.target.checked; $('#wsim-error').hidden = true; });
      const PANTALLAS = { CARD: 'pantallaTarjeta', PSE: 'pantallaPse', NEQUI: 'pantallaNequi', BANCOLOMBIA_TRANSFER: 'pantallaBancolombia', DAVIPLATA: 'pantallaDaviplata' };
      $$('[data-metodo]', this.cuerpo).forEach((b) => b.addEventListener('click', () => {
        if (!this.aceptado) { $('#wsim-error').hidden = false; return; }
        this[PANTALLAS[b.dataset.metodo]]();
      }));
    }

    volver() { return `<button class="wsim__volver" type="button" id="wsim-volver">${icono('izquierda')}Otros medios de pago</button>`; }
    conectarVolver() { $('#wsim-volver')?.addEventListener('click', () => this.pantallaMetodos()); }

    pantallaTarjeta() {
      const anio = String((new Date().getFullYear() + 3) % 100).padStart(2, '0');
      this.pintar(`
        ${this.volver()}
        <h2 class="wsim__titulo">Tarjeta de crédito o débito</h2>
        <div class="wsim__prueba">
          <p>Datos de prueba del Sandbox:</p>
          <button type="button" data-tarjeta="4242 4242 4242 4242">Aprueba · 4242…</button>
          <button type="button" data-tarjeta="4111 1111 1111 1111">Rechaza · 4111…</button>
        </div>
        <form id="wsim-form" novalidate autocomplete="off">
          <div class="wsim__campo"><label for="wsim-num">Número de tarjeta</label><input id="wsim-num" inputmode="numeric" autocomplete="off" maxlength="23" placeholder="0000 0000 0000 0000"></div>
          <div class="wsim__dos">
            <div class="wsim__campo"><label for="wsim-exp">Vence (MM/AA)</label><input id="wsim-exp" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="MM/AA"></div>
            <div class="wsim__campo"><label for="wsim-cvc">CVC</label><input id="wsim-cvc" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="123"></div>
          </div>
          <div class="wsim__campo"><label for="wsim-nom">Nombre en la tarjeta</label><input id="wsim-nom" autocomplete="off"></div>
          <div class="wsim__campo"><label for="wsim-cuotas">Cuotas</label><select id="wsim-cuotas">${[1, 2, 3, 6, 12, 24, 36].map((c) => `<option value="${c}">${c}</option>`).join('')}</select></div>
          <p class="wsim__error" id="wsim-error" role="alert" hidden></p>
          <button class="wsim__pagar" type="submit">Pagar</button>
        </form>`);
      this.conectarVolver();
      const num = $('#wsim-num');
      const exp = $('#wsim-exp');
      num.addEventListener('input', () => { num.value = num.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '); });
      exp.addEventListener('input', () => { const d = exp.value.replace(/\D/g, '').slice(0, 4); exp.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; });
      $$('[data-tarjeta]', this.cuerpo).forEach((b) => b.addEventListener('click', () => {
        num.value = b.dataset.tarjeta;
        exp.value = `12/${anio}`;
        $('#wsim-cvc').value = '123';
        $('#wsim-nom').value = 'PRUEBA ARIZA';
        $('#wsim-error').hidden = true;
      }));
      $('#wsim-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const n = num.value.replace(/\D/g, '');
        const [mes, an] = exp.value.split('/').map(Number);
        const venc = new Date(2000 + an, mes, 1);
        const err = $('#wsim-error');
        const fallo = n.length < 13 || !luhn(n) ? 'Revisa el número de tarjeta.'
          : !(mes >= 1 && mes <= 12) || venc <= new Date() ? 'Revisa la fecha de vencimiento.'
          : !/^\d{3,4}$/.test($('#wsim-cvc').value) ? 'Revisa el código CVC.'
          : !$('#wsim-nom').value.trim() ? 'Escribe el nombre que aparece en la tarjeta.' : '';
        if (fallo) { err.textContent = fallo; err.hidden = false; return; }
        const estado = n === '4242424242424242' ? 'APPROVED' : n === '4111111111111111' ? 'DECLINED' : 'ERROR';
        const mensaje = estado === 'ERROR' ? 'Esta simulación solo acepta las tarjetas de prueba del Sandbox.' : null;
        const metodo = { type: 'CARD', installments: Number($('#wsim-cuotas').value), extra: { brand: marcaTarjeta(n), last_four: n.slice(-4) } };
        this.procesar('CARD', metodo, estado, { mensaje, espera: 'Procesando tu pago…' });
      });
    }

    pantallaNequi() {
      this.pintar(`
        ${this.volver()}
        <h2 class="wsim__titulo">Nequi</h2>
        <div class="wsim__prueba">
          <p>Datos de prueba del Sandbox:</p>
          <button type="button" data-tel="3991111111">Aprueba · 399 111 1111</button>
          <button type="button" data-tel="3992222222">Rechaza · 399 222 2222</button>
        </div>
        <form id="wsim-form" novalidate autocomplete="off">
          <div class="wsim__campo"><label for="wsim-tel">Número de celular Nequi</label><input id="wsim-tel" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="3001234567"></div>
          <p class="wsim__error" id="wsim-error" role="alert" hidden></p>
          <button class="wsim__pagar" type="submit">Continuar</button>
        </form>`);
      this.conectarVolver();
      $$('[data-tel]', this.cuerpo).forEach((b) => b.addEventListener('click', () => { $('#wsim-tel').value = b.dataset.tel; }));
      $('#wsim-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const tel = $('#wsim-tel').value.replace(/\D/g, '');
        if (tel.length !== 10) { const err = $('#wsim-error'); err.textContent = 'Escribe un celular de 10 dígitos.'; err.hidden = false; return; }
        const estado = tel === '3991111111' ? 'APPROVED' : tel === '3992222222' ? 'DECLINED' : 'ERROR';
        this.procesar('NEQUI', { type: 'NEQUI', phone_number: enmascarar(tel) }, estado, { espera: 'Revisa tu app Nequi y acepta la notificación…', demora: 2600 });
      });
    }

    pantallaPse() {
      this.pintar(`
        ${this.volver()}
        <h2 class="wsim__titulo">PSE</h2>
        <form id="wsim-form" novalidate autocomplete="off">
          <div class="wsim__campo"><label for="wsim-persona">Tipo de persona</label><select id="wsim-persona"><option value="0">Natural</option><option value="1">Jurídica</option></select></div>
          <div class="wsim__dos">
            <div class="wsim__campo"><label for="wsim-tipo-doc">Documento</label><select id="wsim-tipo-doc"><option>CC</option><option>CE</option><option>NIT</option></select></div>
            <div class="wsim__campo"><label for="wsim-doc">Número</label><input id="wsim-doc" inputmode="numeric" autocomplete="off"></div>
          </div>
          <div class="wsim__campo"><label for="wsim-banco">Banco (de prueba)</label>
            <select id="wsim-banco"><option value="">Selecciona un banco</option><option value="1">Banco que aprueba</option><option value="2">Banco que rechaza</option></select>
          </div>
          <p class="wsim__error" id="wsim-error" role="alert" hidden></p>
          <button class="wsim__pagar" type="submit">Continuar al banco</button>
        </form>`);
      this.conectarVolver();
      $('#wsim-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const banco = $('#wsim-banco').value;
        const err = $('#wsim-error');
        const fallo = !$('#wsim-doc').value.trim() ? 'Escribe tu número de documento.' : !banco ? 'Selecciona un banco.' : '';
        if (fallo) { err.textContent = fallo; err.hidden = false; return; }
        const metodo = { type: 'PSE', user_type: Number($('#wsim-persona').value), financial_institution_code: banco, payment_description: `Pago a ARIZA, ref. ${this.cfg.reference}` };
        this.procesar('PSE', metodo, banco === '1' ? 'APPROVED' : 'DECLINED', { espera: 'Conectando con tu banco…', demora: 2400 });
      });
    }

    pantallaBancolombia() {
      this.pintar(`
        ${this.volver()}
        <h2 class="wsim__titulo">Botón Bancolombia</h2>
        <p class="wsim__texto">En el Sandbox, el resultado se elige en la página de autenticación:</p>
        <div class="wsim__opciones">
          <button class="wsim__pagar" type="button" data-estado="APPROVED">Aprobar transacción</button>
          <button class="wsim__secundario" type="button" data-estado="DECLINED">Rechazar transacción</button>
          <button class="wsim__secundario" type="button" data-estado="ERROR">Simular error</button>
        </div>`);
      this.conectarVolver();
      $$('[data-estado]', this.cuerpo).forEach((b) => b.addEventListener('click', () => {
        this.procesar('BANCOLOMBIA_TRANSFER', { type: 'BANCOLOMBIA_TRANSFER', payment_description: `Pago a ARIZA, ref. ${this.cfg.reference}` }, b.dataset.estado, { espera: 'Confirmando con Bancolombia…' });
      }));
    }

    pantallaDaviplata() {
      this.pintar(`
        ${this.volver()}
        <h2 class="wsim__titulo">Daviplata</h2>
        <form id="wsim-form" novalidate autocomplete="off">
          <div class="wsim__campo"><label for="wsim-tel">Número de celular Daviplata</label><input id="wsim-tel" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="3001234567"></div>
          <p class="wsim__error" id="wsim-error" role="alert" hidden></p>
          <button class="wsim__pagar" type="submit">Enviar código</button>
        </form>`);
      this.conectarVolver();
      $('#wsim-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const tel = $('#wsim-tel').value.replace(/\D/g, '');
        if (tel.length !== 10) { const err = $('#wsim-error'); err.textContent = 'Escribe un celular de 10 dígitos.'; err.hidden = false; return; }
        this.crearTx('DAVIPLATA', { type: 'DAVIPLATA', phone_number: enmascarar(tel) });
        this.pantallaOtp();
      });
    }

    pantallaOtp() {
      this.pintar(`
        <h2 class="wsim__titulo">Código de seguridad</h2>
        <p class="wsim__texto">Escribe el código de 6 dígitos que enviamos a tu Daviplata.</p>
        <div class="wsim__prueba">
          <p>Datos de prueba del Sandbox:</p>
          <button type="button" data-otp="574829">Aprueba · 574829</button>
          <button type="button" data-otp="932015">Rechaza · 932015</button>
          <button type="button" data-otp="186743">Sin saldo · 186743</button>
          <button type="button" data-otp="999999">Error · 999999</button>
        </div>
        <form id="wsim-form" novalidate autocomplete="off">
          <div class="wsim__campo"><label for="wsim-otp">Código</label><input id="wsim-otp" inputmode="numeric" maxlength="6" autocomplete="off"></div>
          <p class="wsim__error" id="wsim-error" role="alert" hidden></p>
          <button class="wsim__pagar" type="submit">Confirmar pago</button>
        </form>`);
      $$('[data-otp]', this.cuerpo).forEach((b) => b.addEventListener('click', () => { $('#wsim-otp').value = b.dataset.otp; }));
      $('#wsim-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const otp = $('#wsim-otp').value.trim();
        const err = $('#wsim-error');
        if (!/^\d{6}$/.test(otp)) { err.textContent = 'El código tiene 6 dígitos.'; err.hidden = false; return; }
        const resultado = { 574829: ['APPROVED'], 932015: ['DECLINED'], 186743: ['DECLINED', 'Daviplata sin saldo suficiente. No se realizó ningún cobro.'], 999999: ['ERROR'] }[otp];
        if (!resultado) { err.textContent = 'Código inválido. La transacción sigue pendiente: inténtalo de nuevo.'; err.hidden = false; return; }
        this.finalizarConEspera(resultado[0], resultado[1], 'Confirmando tu pago…', 1400);
      });
    }

    /* ---------- Transacción ---------- */
    crearTx(tipo, metodo) {
      const c = this.cfg;
      this.tx = {
        id: nuevoId(), created_at: ahora(), finalized_at: null, amount_in_cents: c.amountInCents, reference: c.reference, currency: c.currency,
        payment_method_type: tipo, payment_method: metodo, redirect_url: c.redirectUrl || null, status: 'PENDING', status_message: null,
        customer_email: c.customerData?.email || null, customer_data: c.customerData || null, shipping_address: c.shippingAddress || null,
        payment_link_id: null, payment_source_id: null, sandbox_simulado: true
      };
      guardarTx(this.tx);
    }

    procesar(tipo, metodo, estado, { mensaje = null, espera, demora = 1600 }) {
      this.crearTx(tipo, metodo);
      this.finalizarConEspera(estado, mensaje, espera, demora);
    }

    finalizarConEspera(estado, mensaje, espera, demora) {
      this.bloqueado = true;
      $('.wsim__cerrar', this.raiz).disabled = true;
      this.pintar(`<div class="wsim__espera" role="status"><span class="wsim__giro" aria-hidden="true"></span><p>${esc(espera)}</p></div>`, false);
      setTimeout(() => this.finalizar(estado, mensaje), demora);
    }

    finalizar(estado, mensaje) {
      const tx = this.tx;
      tx.status = estado;
      tx.status_message = mensaje || MENSAJES[estado][1];
      tx.finalized_at = ahora();
      guardarTx(tx);
      this.enviarEvento(tx);
      this.bloqueado = false;
      $('.wsim__cerrar', this.raiz).disabled = false;
      this.pantallaResultado();
    }

    // Replica el evento transaction.updated que Wompi envía a la URL de eventos del comercio.
    enviarEvento(tx) {
      const timestamp = Math.floor(Date.now() / 1000);
      const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
      recibirEvento({
        event: 'transaction.updated',
        data: { transaction: {
          id: tx.id, amount_in_cents: tx.amount_in_cents, reference: tx.reference, customer_email: tx.customer_email, currency: tx.currency,
          payment_method_type: tx.payment_method_type, redirect_url: tx.redirect_url, status: tx.status, shipping_address: tx.shipping_address,
          payment_link_id: null, payment_source_id: null
        } },
        environment: 'test',
        signature: { properties, checksum: sha256(`${tx.id}${tx.status}${tx.amount_in_cents}${timestamp}${_secretoEventos}`) },
        timestamp,
        sent_at: ahora()
      });
    }

    pantallaResultado() {
      const tx = this.tx;
      const clase = tx.status === 'APPROVED' ? 'ok' : 'mal';
      this.pintar(`
        <div class="wsim__resultado" role="status">
          <span class="wsim__icono wsim__icono--${clase}">${icono(clase === 'ok' ? 'check' : 'alerta')}</span>
          <h2 class="wsim__titulo">${MENSAJES[tx.status][0]}</h2>
          <p class="wsim__texto">${esc(tx.status_message)}</p>
          <dl class="wsim__datos">
            <div><dt>Transacción</dt><dd>${esc(tx.id)}</dd></div>
            <div><dt>Medio de pago</dt><dd>${esc(NOMBRE_METODO[tx.payment_method_type])}</dd></div>
            <div><dt>Estado</dt><dd>${esc(tx.status)}</dd></div>
          </dl>
          <button class="wsim__pagar" type="button" id="wsim-terminar">Volver a la tienda</button>
        </div>`);
      $('#wsim-terminar').addEventListener('click', () => this.terminar());
    }

    pantallaFalla(texto) {
      this.pintar(`
        <div class="wsim__resultado" role="alert">
          <span class="wsim__icono wsim__icono--mal">${icono('alerta')}</span>
          <h2 class="wsim__titulo">No se pudo abrir el pago</h2>
          <p class="wsim__texto">${esc(texto)}</p>
        </div>`, false);
    }

    /* ---------- Cierre ---------- */
    limpiar() {
      this.raiz.remove();
      document.body.classList.remove('sin-scroll');
    }

    // Cierra sin haber terminado: la compra sigue abierta en el checkout.
    salir() {
      if (this.bloqueado) return;
      if (this.tx && this.tx.status !== 'PENDING') { this.terminar(); return; }
      this.limpiar();
      document.dispatchEvent(new CustomEvent('wompi-sim:cerrado'));
    }

    terminar() {
      const tx = this.tx;
      this.limpiar();
      if (this.callback) this.callback({ transaction: tx });
      if (this.cfg.redirectUrl) {
        const sep = this.cfg.redirectUrl.includes('?') ? '&' : '?';
        location.href = `${this.cfg.redirectUrl}${sep}id=${encodeURIComponent(tx.id)}`;
      }
    }
  }

  window.WidgetCheckout = class WidgetCheckout {
    constructor(configuracion) { this.configuracion = configuracion; }
    open(callback) { new SesionPago(this.configuracion, callback).iniciar(); }
  };

  // Equivale a GET /v1/transactions/{id}, que en producción se consulta desde el servidor con la llave privada.
  window.WompiSim = {
    obtenerTransaccion: (id) => leerTx()[id] || null,
    NOMBRE_METODO
  };
})();
