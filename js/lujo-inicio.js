// Capa visual: se carga en <head> para que el primer pintado ya sepa qué efectos usar.
// No toca carrito, catálogo ni pagos.
(function (raiz) {
  'use strict';
  raiz.classList.add('lujo');

  // "mov" activa parallax y bucles. Con "reducir movimiento" en el sistema queda apagado,
  // salvo que se pida ver todo con ?movimiento=1 (se recuerda durante la sesión).
  var forzado = /[?&]movimiento=1/.test(location.search);
  var yaVioIntro = false;
  try {
    if (forzado) sessionStorage.setItem('ariza_mov', '1');
    forzado = forzado || sessionStorage.getItem('ariza_mov') === '1';
    yaVioIntro = sessionStorage.getItem('ariza_intro') === '1';
    sessionStorage.setItem('ariza_intro', '1');
  } catch (e) { /* navegación privada */ }

  var mov = forzado || !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (mov) raiz.classList.add('mov');
  // La intro con el logo sale una sola vez por sesión.
  if (mov && !yaVioIntro) raiz.classList.add('intro-on');
})(document.documentElement);
