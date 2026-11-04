// Núcleo compartido: catálogo, carrito, favoritos, cabecera, pie y paneles laterales.
(function () {
  'use strict';

  const CFG = window.ARIZA_CONFIG;
  const UPLOADS = window.ARIZA_UPLOADS;
  const PRODUCTOS = window.ARIZA_CATALOGO;
  const porId = new Map(PRODUCTOS.map((p) => [p.id, p]));
  const porSlug = new Map(PRODUCTOS.map((p) => [p.s, p]));

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const precio = (n) => '$' + Number(n).toLocaleString('es-CO');
  const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const urlProducto = (p) => `producto.html?p=${encodeURIComponent(p.s)}`;
  const uploads = (ruta) => UPLOADS + ruta;
  const mediano = (ruta) => ruta.replace(/-300x300(\.\w+)$/, '-600x600$1');

  const almacen = {
    leer(clave, porDefecto) {
      try { const v = localStorage.getItem(clave); return v === null ? porDefecto : JSON.parse(v); } catch { return porDefecto; }
    },
    guardar(clave, valor) {
      try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* navegación privada */ }
    }
  };

  const ICONOS = {
    buscar: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
    corazon: '<path d="M12 20s-7.5-4.6-9-9.2C2 7.4 4.3 4.8 7.2 4.8c1.9 0 3.6 1 4.8 2.9 1.2-1.9 2.9-2.9 4.8-2.9 2.9 0 5.2 2.6 4.2 6-1.5 4.6-9 9.2-9 9.2Z"/>',
    bolsa: '<path d="M5 8h14l1 12.5H4L5 8Z"/><path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5"/>',
    menu: '<path d="M3 6.5h18M3 12h18M3 17.5h18"/>',
    cerrar: '<path d="m5 5 14 14M19 5 5 19"/>',
    abajo: '<path d="m5 9 7 7 7-7"/>',
    izquierda: '<path d="m15 5-7 7 7 7"/>',
    derecha: '<path d="m9 5 7 7-7 7"/>',
    filtro: '<path d="M3 7h11M18 7h3M3 17h3M10 17h11"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    ubicacion: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21Z"/><circle cx="12" cy="9.500" r="2.500"/>',
    reloj: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7v5.500l3.500 2"/>',
    telefono: '<path d="M6.500 3.500h3l1.500 4.500-2 1.500a12 12 0 0 0 5.500 5.500l1.500-2 4.500 1.500v3a2 2 0 0 1-2.200 2A17 17 0 0 1 4.500 5.700a2 2 0 0 1 2-2.200Z"/>',
    correo: '<rect x="3" y="5.500" width="18" height="13"/><path d="m3.500 6.500 8.500 7 8.500-7"/>',
    instagram: '<rect x="4" y="4" width="16" height="16" rx="4.500"/><circle cx="12" cy="12" r="3.500"/><circle cx="16.800" cy="7.200" r=".6"/>',
    tiktok: '<path d="M14 4v11a3.500 3.500 0 1 1-3-3.470M14 4c.3 2.600 2 4.300 5 4.600"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    alerta: '<path d="M12 7v6.500M12 17v.2"/>',
    espera: '<circle cx="12" cy="12" r="8"/><path d="M12 7.500V12l3 2"/>'
  };
  const WHATSAPP = '<path d="M12 2.500a9.400 9.400 0 0 0-8 14.300L2.800 21.500l4.800-1.200A9.400 9.400 0 1 0 12 2.500Zm5.500 13.200c-.2.600-1.300 1.200-1.800 1.300-.5 0-1 .200-3.300-.700-2.800-1.100-4.600-3.900-4.700-4.100-.100-.200-1.100-1.500-1.100-2.900s.700-2 1-2.300c.2-.3.500-.3.700-.3h.5c.2 0 .4 0 .6.500l.8 2c.1.100.100.300 0 .500l-.3.500-.4.500c-.1.100-.3.300-.1.600.2.300.8 1.300 1.700 2.100 1.200 1 2.100 1.400 2.400 1.500.3.100.5.100.7-.100l.9-1.100c.2-.3.400-.2.600-.1l1.900.9c.3.100.5.200.5.300.100.100.100.700-.1 1.300Z"/>';
  const icono = (nombre) => `<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre]}</svg>`;
  const iconoWhatsapp = () => `<svg class="icono icono--lleno" viewBox="0 0 24 24" aria-hidden="true">${WHATSAPP}</svg>`;
  const enlaceWhatsapp = (texto) => `https://wa.me/${CFG.tienda.whatsapp}?text=${encodeURIComponent(texto)}`;

  /* ---------- Catálogo ---------- */
  const textoEspecs = (e) => {
    if (!e) return '';
    const partes = [];
    if (e.peso) partes.push(e.peso);
    if (e.talla) partes.push(`Talla ${e.talla}`);
    if (e.medida) partes.push(e.medida);
    return partes.join(' · ');
  };
  const textoPrecio = (p) => (p.pmin === p.pmax ? precio(p.pmin) : `Desde ${precio(p.pmin)}`);
  const lineaOro = (p) => (p.oro === 'italiano' ? 'Oro italiano 18K' : p.oro === 'nacional' ? 'Oro nacional 18K' : p.digital ? 'Bono digital' : 'Oro 18K');
  // En portadas y carruseles priorizamos diseños propios sobre nombres de marcas de terceros.
  const esDisenoPropio = (p) => !/rolex|gucci|cartier|van cleef/i.test(p.n);

  function imgProducto(p, i = 0, sizes = '(min-width: 1200px) 24vw, (min-width: 720px) 32vw, 48vw') {
    const im = p.img[i];
    if (!im) return '';
    const alt = i === 0 ? p.n : '';
    return `<img src="${esc(uploads(mediano(im.t)))}" srcset="${esc(uploads(im.t))} 300w, ${esc(uploads(mediano(im.t)))} 600w" sizes="${sizes}" alt="${esc(alt)}" loading="lazy" decoding="async" width="600" height="600" data-completa="${esc(uploads(im.f))}">`;
  }
  // Algunas fotos no tienen la versión de 600 px: se usa el original.
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName === 'IMG' && img.dataset.completa && img.src !== img.dataset.completa) {
      img.removeAttribute('srcset');
      img.src = img.dataset.completa;
    }
  }, true);

  function tarjeta(p) {
    const detalle = p.e ? textoEspecs(p.e) : p.v ? `${p.v.length} opciones` : '';
    const accion = p.v
      ? `<a class="tarjeta__accion" href="${urlProducto(p)}">Ver opciones</a>`
      : `<button class="tarjeta__accion" type="button" data-agregar="${p.id}">Añadir al carrito</button>`;
    const fav = esFavorito(p.id);
    return `<article class="tarjeta">
      <a class="tarjeta__foto" href="${urlProducto(p)}" tabindex="-1" aria-hidden="true">${imgProducto(p, 0)}${imgProducto(p, 1)}</a>
      <button class="tarjeta__fav ${fav ? 'fav-activo' : ''}" type="button" data-favorito="${p.id}" aria-pressed="${fav}" aria-label="Guardar ${esc(p.n)} en favoritos">${icono('corazon')}</button>
      <h3 class="tarjeta__titulo"><a href="${urlProducto(p)}">${esc(p.n)}</a></h3>
      ${detalle ? `<p class="tarjeta__detalle">${esc(detalle)}</p>` : ''}
      <p class="tarjeta__precio">${textoPrecio(p)}</p>
      ${accion}
    </article>`;
  }

  function montarCarrusel(contenedor, lista) {
    if (!lista.length) { contenedor.closest('section')?.setAttribute('hidden', ''); return; }
    contenedor.classList.add('carrusel');
    contenedor.innerHTML = `
      <button class="carrusel__flecha carrusel__flecha--ant" type="button" aria-label="Productos anteriores">${icono('izquierda')}</button>
      <div class="carrusel__pista" tabindex="0">${lista.map(tarjeta).join('')}</div>
      <button class="carrusel__flecha carrusel__flecha--sig" type="button" aria-label="Productos siguientes">${icono('derecha')}</button>`;
    const pista = $('.carrusel__pista', contenedor);
    const ant = $('.carrusel__flecha--ant', contenedor);
    const sig = $('.carrusel__flecha--sig', contenedor);
    const actualizar = () => {
      ant.disabled = pista.scrollLeft <= 4;
      sig.disabled = pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 4;
    };
    ant.addEventListener('click', () => pista.scrollBy({ left: -pista.clientWidth * 0.8, behavior: 'smooth' }));
    sig.addEventListener('click', () => pista.scrollBy({ left: pista.clientWidth * 0.8, behavior: 'smooth' }));
    pista.addEventListener('scroll', actualizar, { passive: true });
    actualizar();
  }

  /* ---------- Favoritos ---------- */
  let favoritos = almacen.leer('ariza_favoritos', []);
  function esFavorito(id) { return favoritos.includes(id); }
  function alternarFavorito(id) {
    favoritos = esFavorito(id) ? favoritos.filter((f) => f !== id) : [...favoritos, id];
    almacen.guardar('ariza_favoritos', favoritos);
    $$(`[data-favorito="${id}"]`).forEach((b) => {
      b.classList.toggle('fav-activo', esFavorito(id));
      b.setAttribute('aria-pressed', esFavorito(id));
    });
    actualizarContadores();
    decir(esFavorito(id) ? 'Guardado en favoritos' : 'Quitado de favoritos');
  }

  /* ---------- Carrito ---------- */
  let carrito = almacen.leer('ariza_carrito', []).filter((l) => porId.has(l.id));
  const clavesIguales = (a, id, v) => a.id === id && (a.v || null) === (v || null);

  function precioLinea(l) {
    const p = porId.get(l.id);
    if (l.v) {
      const va = (p.v || []).find((x) => x.id === l.v);
      return va ? va.p : p.pmin;
    }
    return p.pmin;
  }
  function etiquetaVariante(l) {
    const p = porId.get(l.id);
    if (l.v) return (p.v || []).find((x) => x.id === l.v)?.e || '';
    return textoEspecs(p.e);
  }
  const subtotalCarrito = () => carrito.reduce((s, l) => s + precioLinea(l) * l.q, 0);
  const unidades = () => carrito.reduce((s, l) => s + l.q, 0);
  function guardarCarrito() {
    almacen.guardar('ariza_carrito', carrito);
    actualizarContadores();
    pintarCarrito();
    document.dispatchEvent(new CustomEvent('carrito:cambio'));
  }
  function agregarAlCarrito(id, v = null, q = 1, abrir = true) {
    const linea = carrito.find((l) => clavesIguales(l, id, v));
    if (linea) linea.q += q; else carrito.push({ id, v, q });
    guardarCarrito();
    if (abrir) Paneles.abrir('panel-carrito'); else decir('Añadido al carrito');
  }
  function cambiarCantidad(indice, delta) {
    const linea = carrito[indice];
    if (!linea) return;
    linea.q += delta;
    if (linea.q <= 0) carrito.splice(indice, 1);
    guardarCarrito();
  }
  function vaciarCarrito() { carrito = []; guardarCarrito(); }

  function pintarCarrito() {
    const cuerpo = $('#carrito-cuerpo');
    const pie = $('#carrito-pie');
    if (!cuerpo) return;
    $('#carrito-titulo').textContent = `Tu carrito (${unidades()})`;
    if (!carrito.length) {
      cuerpo.innerHTML = `<div class="carrito-vacio"><h3>Tu carrito está vacío</h3><p>Descubre las joyas que acompañarán tus momentos más especiales.</p><a class="btn" href="tienda.html">Ver catálogo</a></div>`;
      pie.hidden = true;
      return;
    }
    cuerpo.innerHTML = carrito.map((l, i) => {
      const p = porId.get(l.id);
      const variante = etiquetaVariante(l);
      return `<div class="linea">
        <a class="linea__foto" href="${urlProducto(p)}">${imgProducto(p, 0, '80px')}</a>
        <div>
          <a class="linea__nombre" href="${urlProducto(p)}">${esc(p.n)}</a>
          ${variante ? `<p class="linea__variante">${esc(variante)}</p>` : ''}
          <div class="linea__fila">
            <div class="cantidad">
              <button type="button" data-cantidad="${i}" data-delta="-1" aria-label="Quitar una unidad de ${esc(p.n)}">−</button>
              <span aria-live="polite">${l.q}</span>
              <button type="button" data-cantidad="${i}" data-delta="1" aria-label="Añadir una unidad de ${esc(p.n)}">+</button>
            </div>
            <span class="linea__precio">${precio(precioLinea(l) * l.q)}</span>
          </div>
          <button class="linea__quitar" type="button" data-cantidad="${i}" data-delta="${-l.q}">Quitar</button>
        </div>
      </div>`;
    }).join('');
    const sub = subtotalCarrito();
    const meta = CFG.envio.gratisDesde;
    const falta = Math.max(0, meta - sub);
    $('#carrito-meta').innerHTML = `${falta ? `Te faltan <strong>${precio(falta)}</strong> para el envío gratis` : '<strong>¡Tu pedido tiene envío gratis!</strong>'}
      <div class="envio-meta__barra"><span style="width:${Math.min(100, (sub / meta) * 100)}%"></span></div>`;
    $('#carrito-subtotal').textContent = precio(sub);
    pie.hidden = false;
  }

  /* ---------- Vistos recientemente ---------- */
  function registrarVisto(id) {
    const vistos = [id, ...almacen.leer('ariza_vistos', []).filter((v) => v !== id)].slice(0, 12);
    almacen.guardar('ariza_vistos', vistos);
  }
  const productosVistos = (excluir) => almacen.leer('ariza_vistos', []).filter((v) => v !== excluir && porId.has(v)).map((v) => porId.get(v));

  /* ---------- Paneles laterales ---------- */
  const Paneles = {
    actual: null,
    disparador: null,
    abrir(id) {
      const panel = document.getElementById(id);
      if (!panel) return;
      if (this.actual) this.cerrar(false);
      this.actual = panel;
      this.disparador = document.activeElement;
      panel.classList.add('abierto');
      panel.removeAttribute('aria-hidden');
      $('#velo').classList.add('abierto');
      document.body.classList.add('sin-scroll');
      const foco = panel.querySelector('[data-foco-inicial]') || panel.querySelector('button, a, input, select');
      setTimeout(() => foco && foco.focus(), 60);
    },
    cerrar(devolverFoco = true) {
      if (!this.actual) return;
      this.actual.classList.remove('abierto');
      this.actual.setAttribute('aria-hidden', 'true');
      this.actual = null;
      $('#velo').classList.remove('abierto');
      document.body.classList.remove('sin-scroll');
      if (devolverFoco && this.disparador && this.disparador.focus) this.disparador.focus();
    }
  };
  function atraparFoco(e, raiz) {
    if (e.key !== 'Tab') return;
    const focos = $$('a[href], button:not([disabled]), input, select, textarea', raiz).filter((el) => el.offsetParent !== null);
    if (!focos.length) return;
    const primero = focos[0], ultimo = focos[focos.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  /* ---------- Menú ---------- */
  const tienda = (q) => `tienda.html?${q}`;
  const MENU = [
    { n: 'Anillos', h: tienda('c=anillos'), grupos: [
      { t: 'Para', l: [['Todos los anillos', tienda('c=anillos')], ['Dama', tienda('c=anillos&para=dama')], ['Caballero', tienda('c=anillos&para=caballero')]] },
      { t: 'Ocasión', l: [['Quinceañera', tienda('c=anillos&oc=quinceanera')], ['Promesa', tienda('c=anillos&oc=promesa')]] }
    ], promos: [
      ['Caballero', '2026/08/5.ANILLO-CON-DISENO-DE-AGUILA-PESO_-3.4-GR-MEDIDA_ARIZA-JOYERIA.jpg', tienda('c=anillos&para=caballero')],
      ['Quinceañera', '2026/08/ARIZA-JOYERIA-SLIDER-QUINCEANOS-ANILLOS.jpg', tienda('c=anillos&oc=quinceanera')]
    ] },
    { n: 'Topos y candongas', h: tienda('c=topos-candongas'), grupos: [
      { t: 'Tipo', l: [['Ver todo', tienda('c=topos-candongas')], ['Topos', tienda('c=topos')], ['Candongas', tienda('c=candongas')]] }
    ], promos: [
      ['Candongas', '2026/08/70.-CANDONGA-MERCOCHA-GRANDE-5.60-GR.jpg', tienda('c=candongas')],
      ['Topos', '2026/05/ARIZA-joyas-de-autos-slider3.jpg', tienda('c=topos')]
    ] },
    { n: 'Cadenas', h: tienda('c=cadenas'), grupos: [
      { t: 'Para', l: [['Todas las cadenas', tienda('c=cadenas')], ['Dama', tienda('c=cadenas&para=dama')], ['Caballero', tienda('c=cadenas&para=caballero')]] },
      { t: 'Oro', l: [['Oro nacional', tienda('c=cadenas&oro=nacional')], ['Oro italiano', tienda('c=cadenas&oro=italiano')]] }
    ], promos: [
      ['Oro nacional', '2026/08/65.-CADENA-EN-DISENO-VAN-CLEEF-PESO_-9.webp', tienda('c=cadenas&oro=nacional')],
      ['Caballero', '2026/05/ARIZA-joyas-de-autos-slider2.jpg', tienda('c=cadenas&para=caballero')]
    ] },
    { n: 'Dijes', h: tienda('c=dijes'), grupos: [
      { t: 'Dijes', l: [['Todos los dijes', tienda('c=dijes')], ['Religiosos', tienda('c=dijes&rel=1')]] }
    ], promos: [] },
    { n: 'Herrajes', h: tienda('c=herrajes') },
    { n: 'Pulsos', h: tienda('c=pulsos'), grupos: [
      { t: 'Para', l: [['Todos los pulsos', tienda('c=pulsos')], ['Dama', tienda('c=pulsos&para=dama')], ['Caballero', tienda('c=pulsos&para=caballero')], ['Infantil', tienda('c=pulsos&para=infantil')]] },
      { t: 'También', l: [['Oro italiano', tienda('c=pulsos&oro=italiano')], ['Tobilleras', tienda('c=tobilleras')], ['Balines', tienda('c=balines')]] }
    ], promos: [
      ['Pulsos', '2026/09/PULSO-CUBANO-ARIZA-JOYERIA_2.jpg', tienda('c=pulsos')]
    ] },
    { n: 'Oro italiano', h: tienda('c=oro-italiano'), grupos: [
      { t: 'Oro italiano', l: [['Ver todo', tienda('c=oro-italiano')], ['Cadenas', tienda('c=cadenas&oro=italiano')], ['Pulsos', tienda('c=pulsos&oro=italiano')]] }
    ], promos: [] },
    { n: 'Bono regalo', h: 'producto.html?p=bono-regalo-ariza' }
  ];

  const LOGO = uploads('2026/05/Logo-ARIZA-WEB.png');

  function pintarCabecera() {
    const nav = MENU.map((m) => {
      if (!m.grupos) return `<li class="nav__item"><a class="nav__enlace" href="${m.h}">${esc(m.n)}</a></li>`;
      const cols = m.grupos.map((g) => `<div><p class="mega__titulo">${esc(g.t)}</p>${g.l.map(([t, h]) => `<a href="${h}">${esc(t)}</a>`).join('')}</div>`).join('');
      // Las fotos del mega-menú se piden al abrirlo: así no pesan en cada carga de página.
      const promos = m.promos.map(([t, r, h]) => `<a class="mega__promo" href="${h}"><span><img data-src="${esc(uploads(r))}" alt="" decoding="async"></span><span>${esc(t)}</span></a>`).join('');
      return `<li class="nav__item"><a class="nav__enlace" href="${m.h}">${esc(m.n)}${icono('abajo')}</a>
        <div class="mega"><div class="mega__dentro"><div class="mega__columnas">${cols}</div>${promos ? `<div class="mega__promos">${promos}</div>` : ''}</div></div></li>`;
    }).join('');
    const hueco = $('#cabecera');
    hueco.outerHTML = `
      <a class="saltar" href="#principal">Saltar al contenido</a>
      <div class="aviso">Envío gratis en pedidos superiores a ${precio(CFG.envio.gratisDesde)}<span class="aviso__extra"> · Entrega en ${CFG.envio.plazo}</span></div>
      <header class="cabecera">
        <div class="cabecera__fila">
          <div style="display:flex;align-items:center;gap:4px">
            <button class="icono-btn solo-movil" type="button" data-panel="panel-menu" aria-label="Abrir menú">${icono('menu')}</button>
            <a class="logo" href="index.html" aria-label="ARIZA Joyas de Autor, inicio"><img src="${LOGO}" alt="ARIZA" width="1587" height="500"></a>
          </div>
          <nav class="nav" aria-label="Principal"><ul class="nav__lista">${nav}</ul></nav>
          <div class="iconos">
            <button class="icono-btn" type="button" data-panel="panel-busqueda" aria-label="Buscar">${icono('buscar')}</button>
            <a class="icono-btn" href="tienda.html?favoritos=1" aria-label="Favoritos">${icono('corazon')}<span class="contador" id="contador-favoritos" hidden></span></a>
            <button class="icono-btn" type="button" data-panel="panel-carrito" aria-label="Carrito">${icono('bolsa')}<span class="contador" id="contador-carrito" hidden></span></button>
          </div>
        </div>
      </header>`;
    $$('.nav__item').forEach((item) => {
      const cargar = () => $$('img[data-src]', item).forEach((img) => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
      item.addEventListener('mouseenter', cargar);
      item.addEventListener('focusin', cargar);
    });
  }

  function pintarPaneles() {
    const movil = MENU.map((m) => {
      if (!m.grupos) return `<li><a href="${m.h}">${esc(m.n)}${icono('derecha')}</a></li>`;
      const subs = m.grupos.flatMap((g) => g.l).map(([t, h]) => `<a href="${h}">${esc(t)}</a>`).join('');
      return `<li><details><summary>${esc(m.n)}${icono('abajo')}</summary><div class="menu-movil__sub">${subs}</div></details></li>`;
    }).join('');
    const populares = PRODUCTOS.filter((p) => esDisenoPropio(p) && !p.digital && p.img.length > 1).slice(0, 6);
    document.body.insertAdjacentHTML('beforeend', `
      <div class="velo" id="velo"></div>
      <aside class="panel panel--izq" id="panel-menu" aria-label="Menú" aria-hidden="true">
        <div class="panel__cabeza"><img src="${LOGO}" alt="ARIZA" style="height:30px;width:auto"><button class="icono-btn" type="button" data-cerrar-panel aria-label="Cerrar menú">${icono('cerrar')}</button></div>
        <div class="panel__cuerpo">
          <ul class="menu-movil">${movil}<li><a href="contacto.html">Contáctanos${icono('derecha')}</a></li></ul>
          <div class="menu-movil__contacto"><a class="enlace" href="tel:${CFG.tienda.telefono.replace(/\s/g, '')}">${CFG.tienda.telefono}</a><a class="enlace" href="mailto:${CFG.tienda.correo}">${CFG.tienda.correo}</a></div>
        </div>
      </aside>
      <aside class="panel panel--der panel--ancho" id="panel-busqueda" aria-label="Búsqueda" aria-hidden="true">
        <div class="panel__cabeza"><h2 class="panel__titulo">Buscar</h2><button class="icono-btn" type="button" data-cerrar-panel aria-label="Cerrar búsqueda">${icono('cerrar')}</button></div>
        <div class="panel__cuerpo">
          <label class="buscador"><span class="solo-lector">Buscar joyas</span><input id="busqueda-entrada" type="search" placeholder="Anillo, cadena, candonga…" autocomplete="off" data-foco-inicial>${icono('buscar')}</label>
          <h3 class="busqueda__titulo" id="busqueda-titulo">Populares</h3>
          <div class="grid-productos" id="busqueda-lista">${populares.map(tarjeta).join('')}</div>
          <p class="seccion__pie" id="busqueda-todos" hidden></p>
        </div>
      </aside>
      <aside class="panel panel--der" id="panel-carrito" aria-label="Carrito" aria-hidden="true">
        <div class="panel__cabeza"><h2 class="panel__titulo" id="carrito-titulo">Tu carrito</h2><button class="icono-btn" type="button" data-cerrar-panel aria-label="Cerrar carrito">${icono('cerrar')}</button></div>
        <div class="panel__cuerpo" id="carrito-cuerpo"></div>
        <div class="panel__pie" id="carrito-pie" hidden>
          <div class="envio-meta" id="carrito-meta"></div>
          <div class="total"><span>Subtotal</span><strong id="carrito-subtotal"></strong></div>
          <a class="btn btn--lleno btn--bloque" href="checkout.html">Finalizar compra</a>
          <p class="panel__nota">Paga con tarjeta, PSE, Nequi o Daviplata a través de Wompi</p>
        </div>
      </aside>
      <a class="whatsapp" id="whatsapp-flotante" href="${enlaceWhatsapp('¡Hola! Quiero asesoría con una joya ARIZA.')}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${iconoWhatsapp()}</a>
      <div class="mensaje" id="mensaje" role="status" aria-live="polite"></div>`);
  }

  function pintarPie() {
    const hueco = $('#pie');
    if (!hueco) return;
    const t = CFG.tienda;
    hueco.outerHTML = `
      <footer class="pie">
        <div class="contenedor pie__rejilla">
          <div>
            <img class="pie__logo" src="${LOGO}" alt="ARIZA" loading="lazy" width="1587" height="500">
            <h2 class="pie__titulo">Contáctanos</h2>
            <ul class="pie__lista">
              <li><a href="${t.mapa}" target="_blank" rel="noopener">${esc(t.direccion)}</a></li>
              <li><a href="${enlaceWhatsapp('¡Hola ARIZA!')}" target="_blank" rel="noopener">${iconoWhatsapp()}${t.telefono}</a></li>
              <li><a href="${t.instagram}" target="_blank" rel="noopener">${icono('instagram')}joyeriaariza.co</a></li>
              <li><a href="${t.tiktok}" target="_blank" rel="noopener">${icono('tiktok')}ariza.joyeria</a></li>
              <li><a href="mailto:${t.correo}">${icono('correo')}${t.correo}</a></li>
            </ul>
          </div>
          <div class="pie__boletin">
            <h2>Recibe novedades exclusivas de ARIZA</h2>
            <p>Descubre piezas únicas, lanzamientos exclusivos e inspiración para cada ocasión.</p>
            <form class="boletin" id="boletin" novalidate>
              <label class="solo-lector" for="boletin-correo">Tu correo</label>
              <input id="boletin-correo" type="email" placeholder="Tu correo" autocomplete="email" required>
              <button type="submit">Enviar</button>
            </form>
            <p class="boletin__nota" id="boletin-nota" role="status"></p>
          </div>
          <div>
            <h2 class="pie__titulo">Información</h2>
            <ul class="pie__lista">
              <li><a href="tienda.html">Catálogo</a></li>
              <li><a href="producto.html?p=bono-regalo-ariza">Bono regalo</a></li>
              <li><a href="contacto.html">Contacto</a></li>
              <li><a href="politica-datos.html">Política de tratamiento y protección de datos personales</a></li>
            </ul>
            <a class="btn btn--oro pie__distribuidor" href="contacto.html?asunto=distribuidor">Quiero ser distribuidor</a>
          </div>
        </div>
        <div class="pie__base"><div class="contenedor pie__base-dentro">
          <span>© ${new Date().getFullYear()} ARIZA Joyas de Autor 18K. Todos los derechos reservados.</span>
          <span>Pagos con Wompi: tarjetas, PSE, Nequi, Daviplata y Bancolombia</span>
        </div></div>
      </footer>`;
    $('#boletin').addEventListener('submit', (e) => {
      e.preventDefault();
      const correo = $('#boletin-correo');
      const nota = $('#boletin-nota');
      if (!correo.checkValidity() || !correo.value.trim()) { nota.textContent = 'Escribe un correo válido.'; correo.focus(); return; }
      // Demostración: sin servicio de correo conectado, el dato no se guarda ni se envía.
      nota.textContent = '¡Gracias! Pronto recibirás nuestras novedades.';
      correo.value = '';
    });
  }

  /* ---------- Búsqueda ---------- */
  function buscar(texto) {
    const q = normalizar(texto.trim());
    if (!q) return [];
    const palabras = q.split(/\s+/);
    return PRODUCTOS.filter((p) => {
      const heno = normalizar(`${p.n} ${p.t} ${textoEspecs(p.e)} ${lineaOro(p)}`);
      return palabras.every((w) => heno.includes(w));
    });
  }
  function conectarBusqueda() {
    const entrada = $('#busqueda-entrada');
    const inicial = $('#busqueda-lista').innerHTML;
    entrada.addEventListener('input', () => {
      const q = entrada.value.trim();
      const titulo = $('#busqueda-titulo');
      const lista = $('#busqueda-lista');
      const todos = $('#busqueda-todos');
      if (!q) { titulo.textContent = 'Populares'; lista.innerHTML = inicial; todos.hidden = true; return; }
      const res = buscar(q);
      titulo.textContent = res.length ? `${res.length} resultado${res.length === 1 ? '' : 's'}` : 'Sin resultados';
      lista.innerHTML = res.length ? res.slice(0, 12).map(tarjeta).join('') : `<p class="busqueda__vacio" style="grid-column:1/-1">Prueba con otra palabra o escríbenos por WhatsApp.</p>`;
      todos.hidden = res.length <= 12;
      todos.innerHTML = `<a class="btn" href="tienda.html?q=${encodeURIComponent(q)}">Ver todos</a>`;
    });
    entrada.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && entrada.value.trim()) location.href = `tienda.html?q=${encodeURIComponent(entrada.value.trim())}`;
    });
  }

  /* ---------- Cortesía del 10 % ---------- */
  function programarOferta() {
    if (document.body.dataset.sinOferta !== undefined || almacen.leer('ariza_oferta_vista', false)) return;
    const mostrar = () => {
      window.removeEventListener('scroll', alDesplazar);
      if (almacen.leer('ariza_oferta_vista', false) || Paneles.actual || document.querySelector('.wsim')) return;
      almacen.guardar('ariza_oferta_vista', true);
      document.body.insertAdjacentHTML('beforeend', `
        <div class="oferta" id="oferta" role="dialog" aria-modal="true" aria-labelledby="oferta-titulo">
          <div class="oferta__caja">
            <img class="oferta__foto" src="${uploads('2026/09/ARIZA-JOYERIA-JOYAS-DE-AUTOR-18K-1.jpg')}" alt="">
            <div class="oferta__texto">
              <h2 class="oferta__titulo" id="oferta-titulo">Disfruta un 10 % en tu compra</h2>
              <div id="oferta-paso">
                <p>Déjanos tu correo y activa tu beneficio especial para celebrar nuestro inicio.</p>
                <form id="oferta-form" novalidate>
                  <label class="solo-lector" for="oferta-correo">Correo</label>
                  <input id="oferta-correo" type="email" placeholder="Tu correo" autocomplete="email" required>
                  <button class="btn btn--lleno" type="submit">Activar cortesía</button>
                </form>
              </div>
            </div>
            <button class="oferta__cerrar" type="button" id="oferta-cerrar" aria-label="Cerrar">${icono('cerrar')}</button>
          </div>
        </div>`);
      const caja = $('#oferta');
      const cerrar = () => caja.remove();
      $('#oferta-cerrar').addEventListener('click', cerrar);
      caja.addEventListener('click', (e) => { if (e.target === caja) cerrar(); });
      caja.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); atraparFoco(e, caja); });
      $('#oferta-correo').focus();
      $('#oferta-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const correo = $('#oferta-correo');
        if (!correo.value.trim() || !correo.checkValidity()) { correo.focus(); return; }
        $('#oferta-paso').innerHTML = `<p>Usa este código al finalizar tu compra:</p><p class="oferta__codigo">BIENVENIDA10</p><a class="btn btn--lleno" href="tienda.html">Ver catálogo</a>`;
      });
    };
    // Aparece cuando la persona ya exploró la página, nunca al entrar.
    function alDesplazar() {
      const recorrido = (scrollY + innerHeight) / document.documentElement.scrollHeight;
      if (recorrido > 0.6) mostrar();
    }
    window.addEventListener('scroll', alDesplazar, { passive: true });
  }

  /* ---------- Mensajes ---------- */
  let temporizador;
  function decir(texto) {
    const m = $('#mensaje');
    if (!m) return;
    m.textContent = texto;
    m.classList.add('visible');
    clearTimeout(temporizador);
    temporizador = setTimeout(() => m.classList.remove('visible'), 2200);
  }

  function actualizarContadores() {
    const cc = $('#contador-carrito');
    const cf = $('#contador-favoritos');
    if (cc) { cc.textContent = unidades(); cc.hidden = !unidades(); }
    if (cf) { cf.textContent = favoritos.length; cf.hidden = !favoritos.length; }
  }

  /* ---------- Eventos globales ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-agregar],[data-favorito],[data-panel],[data-cerrar-panel],[data-cantidad]');
    if (e.target.id === 'velo') Paneles.cerrar();
    if (!t) return;
    if (t.dataset.agregar) agregarAlCarrito(Number(t.dataset.agregar));
    else if (t.dataset.favorito) alternarFavorito(Number(t.dataset.favorito));
    else if (t.dataset.panel) Paneles.abrir(t.dataset.panel);
    else if ('cerrarPanel' in t.dataset) Paneles.cerrar();
    else if (t.dataset.cantidad !== undefined) cambiarCantidad(Number(t.dataset.cantidad), Number(t.dataset.delta));
  });
  document.addEventListener('keydown', (e) => {
    if (!Paneles.actual) return;
    if (e.key === 'Escape') Paneles.cerrar();
    else atraparFoco(e, Paneles.actual);
  });

  pintarCabecera();
  pintarPie();
  pintarPaneles();
  pintarCarrito();
  actualizarContadores();
  conectarBusqueda();
  programarOferta();

  window.Ariza = {
    CFG, PRODUCTOS, porId, porSlug, $, $$, esc, precio, normalizar, uploads, urlProducto, almacen,
    icono, iconoWhatsapp, enlaceWhatsapp, tarjeta, imgProducto, montarCarrusel, textoEspecs, textoPrecio, lineaOro, esDisenoPropio,
    buscar, decir, Paneles, atraparFoco, registrarVisto, productosVistos,
    agregarAlCarrito, alternarFavorito, esFavorito, vaciarCarrito, precioLinea, etiquetaVariante, subtotalCarrito,
    get carrito() { return carrito; }
  };
})();
