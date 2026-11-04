(function () {
  'use strict';
  const { PRODUCTOS, CFG, $, esc, icono, iconoWhatsapp, enlaceWhatsapp, montarCarrusel, esDisenoPropio } = window.Ariza;

  // Primero las piezas con más de una foto: aprovechan el cambio de imagen de la tarjeta.
  const vitrina = (filtro, cuantos = 12) => PRODUCTOS
    .filter((p) => filtro(p) && esDisenoPropio(p))
    .sort((a, b) => (b.img.length > 1) - (a.img.length > 1))
    .slice(0, cuantos);

  montarCarrusel($('#carrusel-anillos'), vitrina((p) => p.t === 'anillos'));
  montarCarrusel($('#carrusel-cadenas'), vitrina((p) => p.t === 'cadenas' && p.oro === 'nacional'));
  montarCarrusel($('#carrusel-italiano'), vitrina((p) => p.oro === 'italiano'));

  const t = CFG.tienda;
  $('#visita-lista').innerHTML = `
    <li>${icono('ubicacion')}<span>${esc(t.direccion)}</span></li>
    <li>${icono('reloj')}<span>${t.horario.map(esc).join('<br>')}</span></li>
    <li>${icono('correo')}<a class="enlace" href="mailto:${t.correo}">${t.correo}</a></li>`;
  $('#visita-botones').innerHTML = `
    <a class="btn btn--lleno" href="${enlaceWhatsapp('¡Hola ARIZA! Quiero información sobre sus joyas.')}" target="_blank" rel="noopener">${iconoWhatsapp()}Contactar por WhatsApp</a>
    <a class="btn" href="${t.mapa}" target="_blank" rel="noopener">Cómo llegar</a>`;
})();
