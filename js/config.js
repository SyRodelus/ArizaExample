// Datos del negocio y parámetros de la tienda. Todo lo marcado con PENDIENTE debe confirmarlo ARIZA.
window.ARIZA_CONFIG = {
  moneda: 'COP',
  envio: {
    gratisDesde: 5000000,
    costoNacional: 25000, // PENDIENTE: valor de ejemplo, la web actual no publica la tarifa.
    plazo: '3 a 7 días hábiles'
  },
  cupones: {
    BIENVENIDA10: { porcentaje: 10 } // PENDIENTE: código de ejemplo para la cortesía del 10 %.
  },
  tienda: {
    nombre: 'ARIZA Joyas de Autor',
    direccion: 'Calle 8 # 5-60, Local 29-4, Centro Comercial Cosacut, Centro, Cúcuta',
    horario: ['Lunes a viernes: 8:30 a. m. – 12:00 m. y 2:00 p. m. – 6:00 p. m.', 'Sábados: 8:30 a. m. – 12:00 m.'],
    whatsapp: '573105595861',
    telefono: '+57 310 559 5861',
    correo: 'info@arizajoyeria.com.co',
    instagram: 'https://www.instagram.com/joyeriaariza.co/',
    tiktok: 'https://www.tiktok.com/@ariza.joyeria',
    mapa: 'https://www.google.com/maps/search/?api=1&query=Centro+Comercial+Cosacut+C%C3%BAcuta'
  },
  wompi: {
    llavePublica: 'pub_test_ARIZA_SIMULADA', // En producción: la llave pub_prod_ del comercio.
    urlRespuesta: 'respuesta.html'
  }
};
