// Capa visual de ARIZA: cabecera, apariciones, parallax y hero.
// Solo agrega clases y estilos. No llama a carrito, catálogo, favoritos ni pagos.
(function () {
  'use strict';
  const raiz = document.documentElement;
  const mov = raiz.classList.contains('mov');
  const $$ = (sel, base = document) => [...base.querySelectorAll(sel)];
  const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- Contador de la intro ---------- */
  const contador = document.querySelector('.intro__cuenta');
  if (contador && raiz.classList.contains('intro-on')) {
    const inicio = performance.now();
    const contar = (t) => {
      const v = limitar((t - inicio) / 1500);
      contador.textContent = `${Math.round(v * 100)}%`;
      if (v < 1) requestAnimationFrame(contar);
    };
    requestAnimationFrame(contar);
  }

  /* ---------- Cabecera sobre el hero ---------- */
  const cabecera = document.querySelector('.cabecera');
  const hero = document.querySelector('.hero');
  const alDesplazarCabecera = () => cabecera && cabecera.classList.toggle('solida', scrollY > 40);
  alDesplazarCabecera();
  addEventListener('scroll', alDesplazarCabecera, { passive: true });

  /* ---------- Hero: cambio de imagen ---------- */
  if (hero && hero.querySelector('.hero__img + .hero__img')) {
    const fotos = $$('.hero__img', hero);
    const actual = hero.querySelector('.hero__actual');
    const miniatura = hero.querySelector('.hero__siguiente img');
    const siguiente = hero.querySelector('.hero__siguiente');
    const DURACION = 7000;
    let i = 0;
    let temporizador;

    const pintar = () => {
      fotos.forEach((f, n) => f.classList.toggle('activa', n === i));
      const tono = fotos[i].dataset.tono;
      hero.dataset.tono = tono;
      if (cabecera) cabecera.dataset.tono = tono;
      if (actual) actual.textContent = `0${i + 1}`;
      if (miniatura) miniatura.src = fotos[(i + 1) % fotos.length].currentSrc || fotos[(i + 1) % fotos.length].src;
      // Reinicia la línea de progreso.
      hero.classList.remove('corre');
      void hero.offsetWidth;
      hero.classList.add('corre');
    };
    const programar = (extra = 0) => {
      clearTimeout(temporizador);
      // Con "reducir movimiento" no cambia sola: se cambia con el botón.
      if (mov) temporizador = setTimeout(() => { i = (i + 1) % fotos.length; pintar(); programar(); }, DURACION + extra);
    };
    siguiente?.addEventListener('click', () => { i = (i + 1) % fotos.length; pintar(); programar(); });
    document.addEventListener('visibilitychange', () => { document.hidden ? clearTimeout(temporizador) : programar(); });
    pintar();
    programar(raiz.classList.contains('intro-on') ? 2500 : 0);
  }

  /* ---------- Apariciones al entrar en pantalla ---------- */
  const ver = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      ver.unobserve(e.target);
      if (e.target.classList.contains('carrusel')) $$('.tarjeta', e.target).forEach((t) => t.classList.add('visto'));
      else e.target.classList.add('visto');
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.02 });

  const AUTOMATICOS = [
    '.seccion__cabeza', '.seccion__pie', '.partido__texto', '.partido__foto', '.valor', '.visita > *',
    '.tienda__titulo', '.chips', '.barra-tienda', '.ficha__compra', '.galeria', '.contacto > *', '.resultado__cabeza',
    '.pie__rejilla > *', '[data-rv]'
  ].join(',');

  function preparar(el) {
    if (el.classList.contains('rv') || el.closest('.panel, .oferta, .wsim')) return;
    el.classList.add('rv');
    ver.observe(el);
  }
  function revisarTarjetas(base = document) {
    $$('.tarjeta:not(.rv)', base).forEach((t) => {
      if (t.closest('.panel')) return;
      const pista = t.closest('.carrusel__pista');
      const orden = t.parentElement ? [...t.parentElement.children].indexOf(t) : 0;
      t.classList.add('rv');
      if (pista) {
        // Las tarjetas de un carrusel aparecen juntas; las que están fuera de pantalla no esperan.
        t.style.setProperty('--rv-espera', `${Math.min(orden, 5) * 90}ms`);
        ver.observe(pista.parentElement);
      } else {
        t.style.setProperty('--rv-espera', `${(orden % 4) * 70}ms`);
        ver.observe(t);
      }
    });
  }
  // Seguro: nada que ya esté en pantalla puede quedarse oculto, pase lo que pase con el observador.
  let esperaSeguro;
  const programarSeguro = () => {
    clearTimeout(esperaSeguro);
    esperaSeguro = setTimeout(() => {
      $$('.rv:not(.visto)').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add('visto');
      });
    }, 1200);
  };
  // La lógica del checkout y de la respuesta de pago se deja tal cual, sin apariciones.
  if (!document.body.hasAttribute('data-sin-oferta')) {
    $$(AUTOMATICOS).forEach(preparar);
    revisarTarjetas();
    programarSeguro();
    addEventListener('scroll', programarSeguro, { passive: true });
    // El catálogo vuelve a pintar tarjetas al filtrar, ordenar o "ver más".
    new MutationObserver(() => { revisarTarjetas(); programarSeguro(); }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- Frase que se enciende palabra por palabra ---------- */
  const frase = document.querySelector('[data-palabras]');
  let palabras = [];
  if (frase && mov) {
    const texto = frase.textContent.trim();
    frase.setAttribute('aria-label', texto);
    frase.innerHTML = texto.split(/\s+/).map((p) => `<span class="palabra" aria-hidden="true">${p} </span>`).join('');
    palabras = $$('.palabra', frase);
  }

  /* ---------- Efectos ligados al desplazamiento ---------- */
  if (mov) {
    const paralajes = $$('[data-px]').map((el) => ({ el, f: parseFloat(el.dataset.px) }));
    const trazos = $$('.trazo path').map((p) => ({ p, caja: p.closest('svg') }));
    const banner = document.querySelector('.banner');
    const medios = hero && hero.querySelector('.hero__medios');
    const texto = hero && hero.querySelector('.hero__texto');
    let pendiente = false;

    const actualizar = () => {
      pendiente = false;
      const alto = innerHeight;

      paralajes.forEach(({ el, f }) => {
        const r = (el.parentElement || el).getBoundingClientRect();
        if (r.bottom < -120 || r.top > alto + 120) return;
        const d = r.top + r.height / 2 - alto / 2;
        el.style.transform = `translate3d(0, ${(d * f).toFixed(1)}px, 0) scale(var(--px-escala, 1.16))`;
      });

      trazos.forEach(({ p, caja }) => {
        const r = caja.getBoundingClientRect();
        const v = limitar((alto * 0.95 - r.top) / (r.height + alto * 0.45));
        p.style.strokeDashoffset = (1 - v).toFixed(3);
      });

      if (palabras.length) {
        const r = frase.getBoundingClientRect();
        const v = limitar((alto * 0.86 - r.top) / (r.height + alto * 0.34));
        palabras.forEach((w, n) => {
          const a = limitar(v * palabras.length * 1.15 - n);
          w.style.opacity = (0.16 + a * 0.84).toFixed(2);
        });
      }

      if (banner) {
        const r = banner.getBoundingClientRect();
        const v = limitar((alto - r.top) / (alto * 0.85));
        const c = (1 - v) * 7;
        banner.style.setProperty('--recorte', `${c.toFixed(2)}%`);
      }

      if (medios && scrollY < alto * 1.2) {
        const v = limitar(scrollY / alto);
        medios.style.transform = `translate3d(0, ${(v * alto * 0.2).toFixed(1)}px, 0)`;
        if (texto) texto.style.transform = `translate3d(0, ${(v * alto * 0.08).toFixed(1)}px, 0)`;
      }
    };
    const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); } };
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir, { passive: true });
    addEventListener('load', pedir);
    actualizar();
  }
})();
