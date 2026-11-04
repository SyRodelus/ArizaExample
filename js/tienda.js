(function () {
  'use strict';
  const { PRODUCTOS, $, esc, icono, tarjeta, buscar, esFavorito, esDisenoPropio, enlaceWhatsapp } = window.Ariza;

  const POR_PAGINA = 24;
  const params = new URLSearchParams(location.search);
  const base = {
    c: params.get('c') || '', para: params.get('para') || '', oro: params.get('oro') || '',
    oc: params.get('oc') || '', rel: params.get('rel') || '', q: params.get('q') || '', favoritos: params.get('favoritos') || ''
  };

  const NOMBRES = {
    anillos: 'Anillos', topos: 'Topos', candongas: 'Candongas', 'topos-candongas': 'Topos y candongas', cadenas: 'Cadenas',
    pulsos: 'Pulsos', dijes: 'Dijes', herrajes: 'Herrajes', tobilleras: 'Tobilleras', balines: 'Balines', 'oro-italiano': 'Oro italiano', bono: 'Bono regalo'
  };
  const PARA = { dama: 'Dama', caballero: 'Caballero', infantil: 'Infantil' };
  const ORO = { nacional: 'Oro nacional', italiano: 'Oro italiano' };
  const PRECIOS = [
    { id: '1', t: 'Hasta $500.000', min: 0, max: 500000 },
    { id: '2', t: '$500.000 a $1.000.000', min: 500000, max: 1000000 },
    { id: '3', t: '$1.000.000 a $3.000.000', min: 1000000, max: 3000000 },
    { id: '4', t: '$3.000.000 a $10.000.000', min: 3000000, max: 10000000 },
    { id: '5', t: 'Más de $10.000.000', min: 10000000, max: Infinity }
  ];
  const CHIPS = {
    '': [['Todo', ''], ['Anillos', 'c=anillos'], ['Topos y candongas', 'c=topos-candongas'], ['Cadenas', 'c=cadenas'], ['Dijes', 'c=dijes'], ['Herrajes', 'c=herrajes'], ['Pulsos', 'c=pulsos'], ['Oro italiano', 'c=oro-italiano']],
    anillos: [['Todos', 'c=anillos'], ['Dama', 'c=anillos&para=dama'], ['Caballero', 'c=anillos&para=caballero'], ['Quinceañera', 'c=anillos&oc=quinceanera'], ['Promesa', 'c=anillos&oc=promesa']],
    'topos-candongas': [['Todo', 'c=topos-candongas'], ['Topos', 'c=topos'], ['Candongas', 'c=candongas']],
    cadenas: [['Todas', 'c=cadenas'], ['Dama', 'c=cadenas&para=dama'], ['Caballero', 'c=cadenas&para=caballero'], ['Oro nacional', 'c=cadenas&oro=nacional'], ['Oro italiano', 'c=cadenas&oro=italiano']],
    pulsos: [['Todos', 'c=pulsos'], ['Dama', 'c=pulsos&para=dama'], ['Caballero', 'c=pulsos&para=caballero'], ['Infantil', 'c=pulsos&para=infantil'], ['Oro italiano', 'c=pulsos&oro=italiano']],
    dijes: [['Todos', 'c=dijes'], ['Religiosos', 'c=dijes&rel=1']],
    'oro-italiano': [['Todo', 'c=oro-italiano'], ['Cadenas', 'c=cadenas&oro=italiano'], ['Pulsos', 'c=pulsos&oro=italiano']]
  };
  CHIPS.topos = CHIPS.candongas = CHIPS['topos-candongas'];

  // Selección de filtros del panel, compartible por URL.
  const leerSet = (k) => new Set((params.get(k) || '').split(',').filter(Boolean));
  const filtros = { tipo: leerSet('f_tipo'), oro: leerSet('f_oro'), para: leerSet('f_para'), precio: leerSet('f_precio') };
  let orden = params.get('orden') || 'destacados';
  let visibles = POR_PAGINA;

  function coincideBase(p) {
    if (base.c === 'topos-candongas' && p.t !== 'topos' && p.t !== 'candongas') return false;
    if (base.c === 'oro-italiano' && p.oro !== 'italiano') return false;
    if (base.c && !['topos-candongas', 'oro-italiano'].includes(base.c) && p.t !== base.c) return false;
    if (base.para && !(p.para || []).includes(base.para)) return false;
    if (base.oro && p.oro !== base.oro) return false;
    if (base.oc && p.oc !== base.oc) return false;
    if (base.rel && !p.rel) return false;
    if (base.favoritos && !esFavorito(p.id)) return false;
    return true;
  }
  const universo = (base.q ? buscar(base.q) : PRODUCTOS).filter(coincideBase);
  const enRango = (p, r) => p.pmax >= r.min && p.pmin < r.max;

  function pasaFiltros(p, salvo) {
    if (salvo !== 'tipo' && filtros.tipo.size && !filtros.tipo.has(p.t)) return false;
    if (salvo !== 'oro' && filtros.oro.size && !filtros.oro.has(p.oro)) return false;
    if (salvo !== 'para' && filtros.para.size && !(p.para || []).some((x) => filtros.para.has(x))) return false;
    if (salvo !== 'precio' && filtros.precio.size && !PRECIOS.some((r) => filtros.precio.has(r.id) && enRango(p, r))) return false;
    return true;
  }

  function ordenar(lista) {
    const copia = [...lista];
    if (orden === 'menor') return copia.sort((a, b) => a.pmin - b.pmin);
    if (orden === 'mayor') return copia.sort((a, b) => b.pmin - a.pmin);
    if (orden === 'nombre') return copia.sort((a, b) => a.n.localeCompare(b.n, 'es'));
    return copia.sort((a, b) => (esDisenoPropio(b) - esDisenoPropio(a)) || ((b.img.length > 1) - (a.img.length > 1)));
  }

  function titulo() {
    if (base.favoritos) return 'Tus favoritos';
    if (base.q) return `Resultados para “${base.q}”`;
    if (base.oc === 'quinceanera') return 'Anillos de quinceañera';
    if (base.oc === 'promesa') return 'Anillos de promesa';
    if (base.rel) return 'Dijes religiosos';
    let t = NOMBRES[base.c] || 'Catálogo';
    if (base.para === 'infantil') t += ' infantiles';
    else if (base.para) t += ` para ${base.para}`;
    if (base.oro) t += ` en ${ORO[base.oro].toLowerCase()}`;
    return t;
  }

  function pintarEncabezado() {
    const t = titulo();
    $('#titulo').textContent = t;
    document.title = `${t} | ARIZA Joyas de Autor`;
    const migas = [['Inicio', 'index.html'], ['Catálogo', 'tienda.html']];
    if (base.c && (base.para || base.oro || base.oc || base.rel)) migas.push([NOMBRES[base.c], `tienda.html?c=${base.c}`]);
    if (t !== 'Catálogo') migas.push([t, null]);
    $('#migas').innerHTML = `<ol>${migas.map(([n, h]) => `<li>${h ? `<a href="${h}">${esc(n)}</a>` : `<span aria-current="page">${esc(n)}</span>`}</li>`).join('')}</ol>`;

    const chips = base.q || base.favoritos ? [] : (CHIPS[base.c] || []);
    const actual = ['c', 'para', 'oro', 'oc', 'rel'].filter((k) => base[k]).map((k) => `${k}=${base[k]}`).join('&');
    $('#chips').innerHTML = chips.map(([n, q]) => `<a class="chip" href="tienda.html${q ? `?${q}` : ''}" aria-current="${q === actual}">${esc(n)}</a>`).join('');
    $('#chips').hidden = !chips.length;
    $('#cerrar-filtros').innerHTML = icono('cerrar');
  }

  function pintarFiltros() {
    // Un grupo se muestra según lo que hay en esta colección, para que no desaparezca al filtrar.
    const grupo = (clave, tituloGrupo, opciones) => {
      const posibles = opciones.filter((o) => universo.some(o.cumple));
      if (posibles.length < 2) return '';
      return `<div class="filtro"><fieldset><legend>${tituloGrupo}</legend>
        ${posibles.map((o) => {
          const n = universo.filter((p) => pasaFiltros(p, clave) && o.cumple(p)).length;
          const marcado = filtros[clave].has(o.id);
          return `<label class="casilla"><input type="checkbox" data-filtro="${clave}" value="${esc(o.id)}" ${marcado ? 'checked' : ''} ${n === 0 && !marcado ? 'disabled' : ''}><span>${esc(o.t)}</span><small>${n}</small></label>`;
        }).join('')}
      </fieldset></div>`;
    };
    const tipos = [...new Set(universo.map((p) => p.t))];
    $('#filtros').innerHTML =
      grupo('tipo', 'Tipo de joya', tipos.map((t) => ({ id: t, t: NOMBRES[t] || t, cumple: (p) => p.t === t }))) +
      grupo('oro', 'Oro', Object.entries(ORO).map(([id, t]) => ({ id, t, cumple: (p) => p.oro === id }))) +
      grupo('para', 'Para', Object.entries(PARA).map(([id, t]) => ({ id, t, cumple: (p) => (p.para || []).includes(id) }))) +
      grupo('precio', 'Precio', PRECIOS.map((r) => ({ id: r.id, t: r.t, cumple: (p) => enRango(p, r) })));
  }

  function etiquetaFiltro(clave, valor) {
    if (clave === 'tipo') return NOMBRES[valor] || valor;
    if (clave === 'oro') return ORO[valor];
    if (clave === 'para') return PARA[valor];
    return PRECIOS.find((r) => r.id === valor)?.t || valor;
  }

  function sincronizarUrl() {
    const u = new URLSearchParams();
    Object.entries(base).forEach(([k, v]) => v && u.set(k, v));
    Object.entries(filtros).forEach(([k, s]) => s.size && u.set(`f_${k}`, [...s].join(',')));
    if (orden !== 'destacados') u.set('orden', orden);
    const q = u.toString();
    history.replaceState(null, '', q ? `?${q}` : location.pathname);
  }

  function pintar() {
    const lista = ordenar(universo.filter((p) => pasaFiltros(p)));
    $('#grid').innerHTML = lista.slice(0, visibles).map(tarjeta).join('');
    const activos = Object.values(filtros).reduce((n, s) => n + s.size, 0);
    $('#boton-filtros').innerHTML = `${icono('filtro')}Filtrar${activos ? ` (${activos})` : ''}`;
    $('#total').textContent = `${lista.length} ${lista.length === 1 ? 'pieza' : 'piezas'}`;
    $('#ver-resultados').textContent = `Ver ${lista.length} ${lista.length === 1 ? 'resultado' : 'resultados'}`;
    $('#etiquetas').innerHTML = Object.entries(filtros).flatMap(([k, s]) => [...s].map((v) =>
      `<button class="etiqueta" type="button" data-quitar="${k}" data-valor="${esc(v)}" aria-label="Quitar filtro ${esc(etiquetaFiltro(k, v))}">${esc(etiquetaFiltro(k, v))}${icono('cerrar')}</button>`)).join('');
    $('#vacio').innerHTML = lista.length ? '' : `<div class="tienda__vacio">
      <h2>${base.favoritos ? 'Aún no tienes favoritos' : 'No encontramos piezas con esos criterios'}</h2>
      <p style="margin-bottom:20px">${base.favoritos ? 'Toca el corazón de cualquier joya para guardarla aquí.' : 'Prueba otros filtros o cuéntanos qué buscas.'}</p>
      <a class="btn" href="tienda.html">Ver todo el catálogo</a>
      <a class="btn" style="margin-left:8px" href="${enlaceWhatsapp('¡Hola ARIZA! Estoy buscando una joya y quisiera asesoría.')}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
    </div>`;
    $('#mas').innerHTML = lista.length > visibles ? `<button class="btn" type="button" id="ver-mas">Ver más (${lista.length - visibles})</button>` : '';
    pintarFiltros();
    sincronizarUrl();
  }

  document.addEventListener('change', (e) => {
    const c = e.target.closest('[data-filtro]');
    if (c) {
      const set = filtros[c.dataset.filtro];
      c.checked ? set.add(c.value) : set.delete(c.value);
      visibles = POR_PAGINA;
      const valor = c.value, clave = c.dataset.filtro;
      pintar();
      document.querySelector(`[data-filtro="${clave}"][value="${valor}"]`)?.focus();
    }
    if (e.target.id === 'orden') { orden = e.target.value; pintar(); }
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('#ver-mas')) { visibles += POR_PAGINA; pintar(); return; }
    const q = e.target.closest('[data-quitar]');
    if (q) { filtros[q.dataset.quitar].delete(q.dataset.valor); pintar(); }
    if (e.target.closest('#limpiar')) { Object.values(filtros).forEach((s) => s.clear()); pintar(); }
  });

  $('#orden').value = orden;
  pintarEncabezado();
  pintar();
})();
