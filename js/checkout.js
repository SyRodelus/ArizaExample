(function () {
  'use strict';
  const { CFG, $, $$, esc, precio, porId, imgProducto, urlProducto, etiquetaVariante, precioLinea } = window.Ariza;
  const { cotizar, crearPedido } = window.ServidorSim;

  const DEPARTAMENTOS = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'];
  const CAMPOS_GUARDADOS = ['nombre', 'correo', 'celular', 'tipoDoc', 'documento', 'direccion', 'detalle', 'ciudad', 'departamento', 'notas'];
  const contenido = $('#contenido');

  // Datos del comprador solo durante la pestaña, para no repetirlos si un pago falla.
  const sesion = {
    leer() { try { return JSON.parse(sessionStorage.getItem('ariza_checkout') || '{}'); } catch { return {}; } },
    guardar(d) { try { sessionStorage.setItem('ariza_checkout', JSON.stringify(d)); } catch { /* sin almacenamiento */ } }
  };

  let lineas = window.Ariza.carrito;
  let cupon = '';
  let entrega = 'domicilio';

  function pintarVacio() {
    contenido.innerHTML = `<div class="tienda__vacio"><h1 class="tienda__titulo" style="margin-bottom:14px">Tu carrito está vacío</h1><p style="margin-bottom:22px">Agrega una joya para finalizar tu compra.</p><a class="btn btn--lleno" href="tienda.html">Ver catálogo</a></div>`;
  }

  function campo(id, etiqueta, extra = '', clase = '') {
    return `<div class="campo ${clase}" data-campo="${id}"><label for="${id}">${etiqueta}</label><input id="${id}" name="${id}" ${extra}><p class="campo__error" id="${id}-error" hidden></p></div>`;
  }

  function pintarFormulario() {
    const soloDigital = cotizar(lineas).soloDigital;
    contenido.innerHTML = `
      <nav class="migas" aria-label="Migas de pan"><ol><li><a href="index.html">Inicio</a></li><li><a href="tienda.html">Catálogo</a></li><li><span aria-current="page">Finalizar compra</span></li></ol></nav>
      <h1 class="pago__titulo">Finalizar compra</h1>
      <div class="pago">
        <form id="formulario" novalidate>
          <fieldset class="bloque">
            <legend class="bloque__titulo">Tus datos</legend>
            <div class="campos campos--dos">
              ${campo('nombre', 'Nombre completo', 'autocomplete="name" required', 'campo--ancho')}
              ${campo('correo', 'Correo electrónico', 'type="email" autocomplete="email" required')}
              ${campo('celular', 'Celular', 'type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="3001234567" required')}
              <div class="campo" data-campo="tipoDoc"><label for="tipoDoc">Tipo de documento</label><select id="tipoDoc" name="tipoDoc"><option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="NIT">NIT</option><option value="PP">Pasaporte</option></select></div>
              ${campo('documento', 'Número de documento', 'inputmode="numeric" required')}
            </div>
          </fieldset>

          ${soloDigital ? `
          <fieldset class="bloque">
            <legend class="bloque__titulo">Entrega</legend>
            <p>Tu bono se entrega de forma digital por WhatsApp al celular que indiques.</p>
          </fieldset>` : `
          <fieldset class="bloque">
            <legend class="bloque__titulo">Entrega</legend>
            <div class="entrega">
              <label class="entrega__opcion"><input type="radio" name="entrega" value="domicilio" checked><span><strong>Envío a domicilio</strong><small>Entrega en ${CFG.envio.plazo}, con seguimiento</small></span><span class="entrega__valor" id="valor-envio"></span></label>
              <label class="entrega__opcion"><input type="radio" name="entrega" value="tienda"><span><strong>Recoger en tienda</strong><small>Centro Comercial Cosacut, Cúcuta</small></span><span class="entrega__valor">Gratis</span></label>
            </div>
            <div class="campos campos--dos" id="campos-envio" style="margin-top:16px">
              ${campo('direccion', 'Dirección', 'autocomplete="address-line1" required', 'campo--ancho')}
              ${campo('detalle', 'Apartamento, torre o referencia (opcional)', 'autocomplete="address-line2"', 'campo--ancho')}
              ${campo('ciudad', 'Ciudad', 'autocomplete="address-level2" required')}
              <div class="campo" data-campo="departamento"><label for="departamento">Departamento</label><select id="departamento" name="departamento" autocomplete="address-level1" required><option value="">Selecciona</option>${DEPARTAMENTOS.map((d) => `<option>${d}</option>`).join('')}</select><p class="campo__error" id="departamento-error" hidden></p></div>
            </div>
            <p class="contacto__nota" style="margin-top:12px">¿Envío internacional? <a class="enlace" href="${window.Ariza.enlaceWhatsapp('¡Hola ARIZA! Quiero cotizar un envío internacional.')}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a> para cotizarlo.</p>
          </fieldset>`}

          <div class="campo" style="margin-top:18px"><label for="notas">Notas del pedido (opcional)</label><textarea id="notas" name="notas" maxlength="300"></textarea></div>

          <label class="autoriza"><input type="checkbox" id="autoriza"><span>Autorizo el tratamiento de mis datos según la <a class="enlace" href="politica-datos.html" target="_blank" rel="noopener">política de tratamiento y protección de datos personales</a>.</span></label>
          <p class="campo__error" id="autoriza-error" hidden></p>

          <button class="btn btn--oro btn--bloque pago__boton" type="submit" id="pagar"></button>
          <p class="pago__metodos">Serás atendido en la ventana segura de Wompi: tarjeta, PSE, Nequi, Daviplata y Botón Bancolombia.</p>
        </form>

        <aside class="resumen" aria-labelledby="resumen-titulo">
          <h2 class="resumen__titulo" id="resumen-titulo">Tu pedido</h2>
          <div>${lineas.map((l) => {
            const p = porId.get(l.id);
            const v = etiquetaVariante(l);
            return `<div class="linea">
              <a class="linea__foto" href="${urlProducto(p)}">${imgProducto(p, 0, '62px')}<span class="linea__cant">${l.q}</span></a>
              <div><p class="linea__nombre">${esc(p.n)}</p>${v ? `<p class="linea__variante">${esc(v)}</p>` : ''}</div>
              <span class="linea__precio">${precio(precioLinea(l) * l.q)}</span>
            </div>`;
          }).join('')}</div>
          <form class="cupon" id="cupon-form" novalidate>
            <label class="solo-lector" for="cupon">Código de descuento</label>
            <input id="cupon" placeholder="Código de descuento" autocomplete="off">
            <button type="submit">Aplicar</button>
          </form>
          <p class="cupon__nota" id="cupon-nota" role="status"></p>
          <div class="cuentas" id="cuentas"></div>
        </aside>
      </div>`;

    const guardados = sesion.leer();
    CAMPOS_GUARDADOS.forEach((c) => { const el = document.getElementById(c); if (el && guardados[c]) el.value = guardados[c]; });

    $$('input[name="entrega"]').forEach((r) => r.addEventListener('change', () => {
      entrega = r.value;
      $('#campos-envio').hidden = entrega === 'tienda';
      actualizarCuentas();
    }));
    $('#cupon-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const valor = $('#cupon').value.trim().toUpperCase();
      const nota = $('#cupon-nota');
      if (!valor) { nota.textContent = ''; return; }
      if (CFG.cupones[valor]) {
        cupon = valor;
        nota.className = 'cupon__nota cupon__nota--ok';
        nota.textContent = `Código ${valor} aplicado: ${CFG.cupones[valor].porcentaje} % de descuento.`;
      } else {
        cupon = '';
        nota.className = 'cupon__nota cupon__nota--mal';
        nota.textContent = 'Ese código no es válido.';
      }
      actualizarCuentas();
    });
    $('#formulario').addEventListener('submit', enviar);
    $('#formulario').addEventListener('input', (e) => { if (e.target.id) marcar(e.target.id, ''); });
    $('#autoriza').addEventListener('change', () => marcar('autoriza', ''));
    actualizarCuentas();
  }

  function actualizarCuentas() {
    const c = cotizar(lineas, { entrega, cupon });
    $('#cuentas').innerHTML = `
      <div><span>Subtotal</span><span>${precio(c.subtotal)}</span></div>
      ${c.descuento ? `<div><span>Descuento (${esc(c.cupon)})</span><span>−${precio(c.descuento)}</span></div>` : ''}
      ${c.soloDigital ? '' : `<div><span>Envío</span><span>${c.envio ? precio(c.envio) : 'Gratis'}</span></div>`}
      <div class="cuentas__total"><span>Total</span><span>${precio(c.total)}</span></div>`;
    const valorEnvio = $('#valor-envio');
    if (valorEnvio) {
      const siDomicilio = cotizar(lineas, { entrega: 'domicilio', cupon });
      valorEnvio.textContent = siDomicilio.envio ? precio(siDomicilio.envio) : 'Gratis';
    }
    $('#pagar').textContent = `Pagar ${precio(c.total)} con Wompi`;
  }

  /* ---------- Validación ---------- */
  function marcar(id, mensaje) {
    const envoltura = document.querySelector(`[data-campo="${id}"]`);
    const error = document.getElementById(`${id}-error`);
    const el = document.getElementById(id);
    if (envoltura) envoltura.classList.toggle('campo--error', !!mensaje);
    if (error) { error.textContent = mensaje || ''; error.hidden = !mensaje; }
    if (el) { el.setAttribute('aria-invalid', !!mensaje); if (mensaje) el.setAttribute('aria-describedby', `${id}-error`); }
    return !mensaje;
  }

  function validar() {
    const v = (id) => document.getElementById(id)?.value.trim() || '';
    const domicilio = $('#campos-envio') && entrega === 'domicilio';
    const reglas = [
      ['nombre', v('nombre').split(/\s+/).length >= 2 ? '' : 'Escribe tu nombre y apellido.'],
      ['correo', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('correo')) ? '' : 'Escribe un correo válido.'],
      ['celular', /^3\d{9}$/.test(v('celular')) ? '' : 'Escribe un celular de 10 dígitos que empiece por 3.'],
      ['documento', /^[\dA-Za-z-]{5,15}$/.test(v('documento')) ? '' : 'Escribe tu número de documento.']
    ];
    if (domicilio) {
      reglas.push(['direccion', v('direccion').length >= 5 ? '' : 'Escribe la dirección de entrega.']);
      reglas.push(['ciudad', v('ciudad') ? '' : 'Escribe la ciudad.']);
      reglas.push(['departamento', v('departamento') ? '' : 'Selecciona el departamento.']);
    }
    reglas.push(['autoriza', $('#autoriza').checked ? '' : 'Debes autorizar el tratamiento de datos para continuar.']);
    let primero = null;
    reglas.forEach(([id, msg]) => { if (!marcar(id, msg) && !primero) primero = id; });
    if (primero) document.getElementById(primero).focus();
    return !primero;
  }

  /* ---------- Pago ---------- */
  function enviar(e) {
    e.preventDefault();
    if (!validar()) return;
    const v = (id) => document.getElementById(id)?.value.trim() || '';
    sesion.guardar(Object.fromEntries(CAMPOS_GUARDADOS.map((c) => [c, v(c)])));

    const cliente = { nombre: v('nombre'), correo: v('correo'), celular: v('celular'), tipoDoc: v('tipoDoc'), documento: v('documento') };
    const domicilio = $('#campos-envio') && entrega === 'domicilio';
    const direccion = domicilio ? { linea: v('direccion'), detalle: v('detalle'), ciudad: v('ciudad'), departamento: v('departamento') } : null;

    // En producción: fetch('/api/pedidos') devuelve referencia, monto y firma calculados en el servidor.
    const pedido = crearPedido({ lineas, cliente, entrega, direccion, cupon, notas: v('notas') });

    const configuracion = {
      currency: pedido.moneda,
      amountInCents: pedido.montoEnCentavos,
      reference: pedido.referencia,
      publicKey: CFG.wompi.llavePublica,
      signature: { integrity: pedido.firma },
      redirectUrl: new URL(CFG.wompi.urlRespuesta, location.href).href,
      customerData: { email: cliente.correo, fullName: cliente.nombre, phoneNumber: cliente.celular, phoneNumberPrefix: '+57', legalId: cliente.documento, legalIdType: cliente.tipoDoc }
    };
    if (direccion) {
      configuracion.shippingAddress = { addressLine1: direccion.linea, city: direccion.ciudad, phoneNumber: cliente.celular, region: direccion.departamento, country: 'CO' };
    }

    const boton = $('#pagar');
    boton.disabled = true;
    new window.WidgetCheckout(configuracion).open(() => { /* Wompi redirige a redirectUrl con ?id= */ });
    document.addEventListener('wompi-sim:cerrado', () => { boton.disabled = false; boton.focus(); }, { once: true });
  }

  if (!lineas.length) pintarVacio(); else pintarFormulario();
})();
