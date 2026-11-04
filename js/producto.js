(function () {
  'use strict';
  const {
    CFG, PRODUCTOS, porSlug, $, $$, esc, precio, uploads, icono, iconoWhatsapp, enlaceWhatsapp, textoPrecio, textoEspecs, lineaOro,
    agregarAlCarrito, esFavorito, montarCarrusel, registrarVisto, productosVistos
  } = window.Ariza;

  const principal = $('#principal');
  const p = porSlug.get(new URLSearchParams(location.search).get('p'));
  if (!p) {
    principal.innerHTML = `<div class="contenedor tienda__vacio"><h1 class="tienda__titulo" style="margin-bottom:16px">No encontramos esta joya</h1><a class="btn" href="tienda.html">Ver catálogo</a></div>`;
    return;
  }
  registrarVisto(p.id);

  const NOMBRE_TIPO = {
    anillos: ['Anillos', 'c=anillos'], candongas: ['Candongas', 'c=candongas'], topos: ['Topos', 'c=topos'], cadenas: ['Cadenas', 'c=cadenas'],
    pulsos: ['Pulsos', 'c=pulsos'], dijes: ['Dijes', 'c=dijes'], herrajes: ['Herrajes', 'c=herrajes'], tobilleras: ['Tobilleras', 'c=tobilleras'], balines: ['Balines', 'c=balines']
  };
  const tipo = NOMBRE_TIPO[p.t];
  const tituloOpcion = p.digital ? 'Elige el valor' : 'Elige peso y medida';
  let variante = null;

  /* ---------- Acordeones ---------- */
  function acordeon(titulo, contenido, abierto = false) {
    return `<details class="acordeon" ${abierto ? 'open' : ''}><summary>${titulo}${icono('abajo')}</summary><div class="acordeon__cuerpo">${contenido}</div></details>`;
  }
  const acordeones = [];
  if (p.digital) {
    acordeones.push(acordeon('Cómo funciona', `
      <p>Sorprende a quien más quieres con un regalo que siempre acierta: una joya ARIZA elegida a su gusto.</p>
      <p>Entrega digital por WhatsApp. Redimible en nuestra tienda del Centro Comercial Cosacut, en Cúcuta. Vigencia de 6 meses.</p>
      <p>Si la joya elegida supera el valor del bono, puedes completar la diferencia con otro medio de pago.</p>`, true));
    acordeones.push(acordeon('Condiciones', '<p>Aplican términos, condiciones y restricciones. Válido en productos seleccionados.</p>'));
  } else {
    const filas = p.v
      ? `<ul>${p.v.map((v) => `<li><span>${esc(v.e)}</span><span>${precio(v.p)}</span></li>`).join('')}</ul>`
      : `<ul>${p.e?.peso ? `<li><span>Peso</span><span>${esc(p.e.peso)}</span></li>` : ''}${p.e?.talla ? `<li><span>Talla</span><span>${esc(p.e.talla)}</span></li>` : ''}${p.e?.medida ? `<li><span>Medida</span><span>${esc(p.e.medida)}</span></li>` : ''}</ul>`;
    acordeones.push(acordeon('Detalles', `<p>${esc(lineaOro(p))}. Joya de autor ARIZA.</p>${filas}`, true));
    acordeones.push(acordeon('Envíos y entregas', `
      <p>Envíos nacionales e internacionales con seguimiento de tu pedido y empaque protegido.</p>
      <p>Entrega en ${CFG.envio.plazo}. Envío gratis en pedidos superiores a ${precio(CFG.envio.gratisDesde)}.</p>`));
    acordeones.push(acordeon('Cuidado de tu joya', `
      <p>Guarda cada pieza por separado para evitar rayones y retírala antes de usar perfumes o productos de limpieza.</p>
      <p>Límpiala con un paño suave y seco.</p>`));
  }
  acordeones.push(acordeon('Pagos seguros', `
    <p>Procesados por Wompi. Paga con tarjeta de crédito o débito, PSE, Nequi, Daviplata o Botón Bancolombia.</p>`));

  /* ---------- Galería ---------- */
  const fotos = p.img;
  const miniaturas = fotos.length > 1
    ? `<div class="galeria__miniaturas">${fotos.map((im, i) => `<button class="galeria__miniatura" type="button" data-foto="${i}" aria-current="${i === 0}" aria-label="Ver foto ${i + 1}"><img src="${esc(uploads(im.t))}" alt="" loading="lazy"></button>`).join('')}</div>`
    : '';
  const flechas = fotos.length > 1
    ? `<button class="galeria__flecha galeria__flecha--ant" type="button" aria-label="Foto anterior">${icono('izquierda')}</button><button class="galeria__flecha galeria__flecha--sig" type="button" aria-label="Foto siguiente">${icono('derecha')}</button>`
    : '';
  const pista = fotos.map((im, i) => `<div class="galeria__foto"><img src="${esc(uploads(im.f))}" alt="${esc(p.n)}${i ? `, foto ${i + 1}` : ''}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" width="1080" height="1080"></div>`).join('');

  const especs = p.e ? `<p class="ficha__especs">${esc(textoEspecs(p.e))}</p>` : '';
  const opciones = p.v ? `
    <div class="opciones" id="opciones">
      <p class="opciones__titulo">${tituloOpcion}</p>
      <div class="opciones__lista" role="group" aria-label="${tituloOpcion}">
        ${p.v.map((v) => `<button class="opcion" type="button" data-variante="${v.id}" aria-pressed="false">${esc(v.e)}${p.digital ? '' : `<small>${precio(v.p)}</small>`}</button>`).join('')}
      </div>
      <p class="opciones__error" id="opciones-error" role="alert" hidden>Elige una opción para continuar.</p>
    </div>` : '';

  const mensajeWa = `¡Hola ARIZA! Me interesa: ${p.n}. ${location.href}`;
  principal.innerHTML = `
    <div class="contenedor">
      <nav class="migas" aria-label="Migas de pan"><ol>
        <li><a href="index.html">Inicio</a></li>
        <li><a href="tienda.html">Catálogo</a></li>
        ${tipo ? `<li><a href="tienda.html?${tipo[1]}">${tipo[0]}</a></li>` : ''}
        <li><span aria-current="page">${esc(p.n)}</span></li>
      </ol></nav>
      <div class="ficha">
        <div class="galeria">
          ${miniaturas}
          <div class="galeria__marco">
            <div class="galeria__pista" id="pista" tabindex="0" aria-label="Fotos del producto">${pista}</div>
            ${flechas}
          </div>
        </div>
        <div class="ficha__compra">
          <h1 class="ficha__titulo">${esc(p.n)}</h1>
          <p class="ficha__linea">${esc(lineaOro(p))}</p>
          <p class="ficha__precio" id="precio-actual">${textoPrecio(p)}</p>
          ${especs}
          ${opciones}
          <div class="compra__fila">
            <button class="btn btn--lleno" type="button" id="agregar">Añadir al carrito</button>
            <button class="compra__fav ${esFavorito(p.id) ? 'fav-activo' : ''}" type="button" data-favorito="${p.id}" aria-pressed="${esFavorito(p.id)}" aria-label="Guardar en favoritos">${icono('corazon')}</button>
          </div>
          <a class="btn btn--bloque compra__wa" href="${enlaceWhatsapp(mensajeWa)}" target="_blank" rel="noopener">${iconoWhatsapp()}Consultar por WhatsApp</a>
          <p class="compra__nota">Paga con tarjeta, PSE, Nequi o Daviplata a través de Wompi</p>
          ${p.digital ? '' : `<div class="recogida"><strong>Recoge gratis en tienda</strong>Centro Comercial Cosacut, Cúcuta. O recíbela en ${CFG.envio.plazo}.</div>`}
          <div class="acordeones">${acordeones.join('')}</div>
        </div>
      </div>
    </div>
    <section class="seccion seccion--crema" aria-labelledby="titulo-combina" id="seccion-combina">
      <div class="contenedor"><div class="seccion__cabeza"><h2 class="seccion__titulo" id="titulo-combina">Combínala con</h2></div><div id="carrusel-combina"></div></div>
    </section>
    <section class="seccion" aria-labelledby="titulo-parecidas" id="seccion-parecidas">
      <div class="contenedor"><div class="seccion__cabeza"><h2 class="seccion__titulo" id="titulo-parecidas">También te puede gustar</h2></div><div id="carrusel-parecidas"></div></div>
    </section>
    <section class="seccion seccion--crema" aria-labelledby="titulo-vistos" id="seccion-vistos">
      <div class="contenedor"><div class="seccion__cabeza"><h2 class="seccion__titulo" id="titulo-vistos">Vistos recientemente</h2></div><div id="carrusel-vistos"></div></div>
    </section>
    <div class="barra-compra" id="barra-compra" aria-hidden="true"><div class="contenedor barra-compra__dentro">
      <div style="min-width:0"><p class="barra-compra__nombre">${esc(p.n)}</p><p class="barra-compra__precio" id="barra-precio">${textoPrecio(p)}</p></div>
      <button class="btn btn--lleno" type="button" id="barra-agregar" tabindex="-1">Añadir al carrito</button>
    </div></div>`;

  /* ---------- Metadatos ---------- */
  const descripcion = `${p.n} en ${lineaOro(p).toLowerCase()}. ${textoPrecio(p)}. Joyas de autor ARIZA con envíos nacionales e internacionales.`;
  document.title = `${p.n} | ARIZA Joyas de Autor`;
  $('meta[name="description"]').setAttribute('content', descripcion);
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product', name: p.n, description: descripcion,
    image: fotos.map((im) => uploads(im.f)), brand: { '@type': 'Brand', name: 'ARIZA' },
    offers: { '@type': 'AggregateOffer', priceCurrency: 'COP', lowPrice: p.pmin, highPrice: p.pmax, availability: 'https://schema.org/InStock' }
  });
  document.head.appendChild(ld);

  /* ---------- Selección de variante ---------- */
  const precioActual = $('#precio-actual');
  $$('[data-variante]').forEach((b) => b.addEventListener('click', () => {
    variante = p.v.find((v) => v.id === Number(b.dataset.variante));
    $$('[data-variante]').forEach((o) => o.setAttribute('aria-pressed', o === b));
    precioActual.textContent = precio(variante.p);
    $('#barra-precio').textContent = `${variante.e} · ${precio(variante.p)}`;
    $('#opciones-error').hidden = true;
  }));
  function intentarAgregar() {
    if (p.v && !variante) {
      $('#opciones-error').hidden = false;
      $('#opciones').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    agregarAlCarrito(p.id, variante ? variante.id : null);
  }
  $('#agregar').addEventListener('click', intentarAgregar);
  $('#barra-agregar').addEventListener('click', intentarAgregar);

  /* ---------- Galería: flechas, miniaturas y zoom ---------- */
  const elPista = $('#pista');
  const irA = (i) => elPista.scrollTo({ left: elPista.children[i].offsetLeft - elPista.offsetLeft, behavior: 'smooth' });
  const fotoActual = () => Math.round(elPista.scrollLeft / (elPista.children[0].offsetWidth + 6));
  $$('[data-foto]').forEach((b) => b.addEventListener('click', () => irA(Number(b.dataset.foto))));
  $('.galeria__flecha--ant')?.addEventListener('click', () => irA((fotoActual() - 1 + fotos.length) % fotos.length));
  $('.galeria__flecha--sig')?.addEventListener('click', () => irA((fotoActual() + 1) % fotos.length));
  elPista.addEventListener('scroll', () => {
    const i = fotoActual();
    $$('[data-foto]').forEach((b) => b.setAttribute('aria-current', Number(b.dataset.foto) === i));
  }, { passive: true });
  if (matchMedia('(hover: hover) and (min-width: 960px)').matches) {
    $$('.galeria__foto').forEach((marco) => {
      const img = $('img', marco);
      marco.addEventListener('mousemove', (e) => {
        const r = marco.getBoundingClientRect();
        img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
        img.style.transform = 'scale(1.8)';
      });
      marco.addEventListener('mouseleave', () => { img.style.transform = ''; });
    });
  }

  /* ---------- Barra de compra fija ---------- */
  const barra = $('#barra-compra');
  new IntersectionObserver(([entrada]) => {
    const mostrar = !entrada.isIntersecting && entrada.boundingClientRect.top < 0;
    barra.classList.toggle('visible', mostrar);
    barra.setAttribute('aria-hidden', !mostrar);
    $('#barra-agregar').tabIndex = mostrar ? 0 : -1;
    document.body.classList.toggle('barra-visible', mostrar);
  }).observe($('#agregar'));

  /* ---------- WhatsApp con contexto ---------- */
  $('#whatsapp-flotante').href = enlaceWhatsapp(mensajeWa);

  /* ---------- Recomendaciones ---------- */
  const COMBINA = {
    anillos: ['candongas', 'topos', 'pulsos'], candongas: ['anillos', 'cadenas'], topos: ['anillos', 'cadenas'],
    cadenas: ['dijes', 'herrajes'], dijes: ['cadenas'], herrajes: ['cadenas', 'pulsos'], pulsos: ['anillos', 'balines', 'herrajes'],
    tobilleras: ['pulsos', 'anillos'], balines: ['pulsos', 'herrajes'], bono: ['anillos', 'cadenas', 'pulsos']
  };
  const cercanosEnPrecio = (lista) => lista
    .filter((x) => x.id !== p.id && !x.digital)
    .sort((a, b) => Math.abs(a.pmin - p.pmin) - Math.abs(b.pmin - p.pmin))
    .slice(0, 10);
  montarCarrusel($('#carrusel-combina'), cercanosEnPrecio(PRODUCTOS.filter((x) => (COMBINA[p.t] || []).includes(x.t))));
  montarCarrusel($('#carrusel-parecidas'), cercanosEnPrecio(PRODUCTOS.filter((x) => x.t === p.t)));
  montarCarrusel($('#carrusel-vistos'), productosVistos(p.id));
})();
