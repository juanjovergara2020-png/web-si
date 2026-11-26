/*
  MENÚ Y PIE DE PÁGINA COMUNES DE juanjovergara.com
  ─────────────────────────────────────────────────
  Este archivo dibuja el mismo menú (arriba) y el mismo pie (abajo) en todas las páginas.
  Para cambiar el menú de TODA la web, basta con tocar las listas de aquí debajo.

  Cada página lo carga así, justo después de <body>:
    <script src="/comun/menu.js"></script>
  Si una página no debe llevar pie (por ejemplo, la de la web anterior), se escribe:
    <script src="/comun/menu.js" data-sin-pie></script>
*/
(function () {
  // ── 1. Opciones del menú principal (en este orden) ──
  //    «marca» = partes de la dirección en las que esa opción aparece resaltada
  var MENU = [
    { texto: 'Acerca de mí',  enlace: '/#acerca-de-mi' },
    { texto: 'Formación',     enlace: '/formacion.html',                marca: ['/formacion'] },
    { texto: 'Publicaciones', enlace: '/#publicaciones',                marca: ['/publicaciones', '/blog'] },
    { texto: 'Vídeos',        enlace: '/#videos' },
    { texto: 'Imágenes',      enlace: '/#imagenes' },
    { texto: 'Proyectos',     enlace: '/proyectos/index-proyectos.html', marca: ['/proyectos'] }
  ];
  var CONTACTO = { texto: 'Contacto', enlace: '/#contacto' };

  // ── 2. Enlaces del pie de página ──
  var PIE = [
    { texto: 'Blog',            enlace: '/blog/',        marca: ['/blog'] },
    { texto: 'Saber más de mí', enlace: '/mas-de-mi.html', marca: ['/mas-de-mi', '/web-anterior'] }
  ];

  // ───────────────── A partir de aquí no hace falta tocar nada ─────────────────
  var script = document.currentScript;
  var ruta = location.pathname.replace(/\/index\.html$/, '/');
  var enPortada = ruta === '/' || ruta === '/index';

  // En la portada, los enlaces a secciones no recargan la página
  function destino(enlace) {
    return enPortada && enlace.indexOf('/#') === 0 ? enlace.slice(1) : enlace;
  }
  function esActual(op) {
    return (op.marca || []).some(function (m) { return ruta.indexOf(m) === 0; });
  }
  function enlaceHTML(op, clase) {
    var actual = esActual(op);
    return '<a href="' + destino(op.enlace) + '" class="' + clase + (actual ? ' actual' : '') + '"' +
      (actual ? ' aria-current="page"' : '') + '>' + op.texto + '</a>';
  }

  var iconoAbrir = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var iconoCerrar = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  var cabecera =
    '<header class="cabecera-sitio">' +
      '<a class="logo-sitio" href="' + (enPortada ? '#top' : '/') + '">' +
        '<img class="logo-normal" src="/logo-juanjo.png" alt="Juanjo Vergara, ir al inicio">' +
        '<img class="logo-blanco" src="/logo-juanjo-blanco.png" alt="" aria-hidden="true">' +
      '</a>' +
      '<button class="boton-menu" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu-sitio">' + iconoAbrir + '</button>' +
      '<nav class="menu-sitio" id="menu-sitio" aria-label="Menú principal">' +
        MENU.map(function (op) { return enlaceHTML(op, 'menu-enlace'); }).join('') +
        enlaceHTML(CONTACTO, 'menu-enlace menu-contacto') +
      '</nav>' +
    '</header>';

  script.insertAdjacentHTML('beforebegin', cabecera);

  // ── Abrir y cerrar el menú en móvil y tablet ──
  var boton = document.querySelector('.cabecera-sitio .boton-menu');
  var menu = document.getElementById('menu-sitio');
  function ponerMenu(abierto) {
    menu.classList.toggle('abierto', abierto);
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    boton.innerHTML = abierto ? iconoCerrar : iconoAbrir;
  }
  boton.addEventListener('click', function (e) {
    e.stopPropagation();
    ponerMenu(!menu.classList.contains('abierto'));
  });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) ponerMenu(false); });
  document.addEventListener('click', function (e) {
    if (menu.classList.contains('abierto') && !e.target.closest('.cabecera-sitio')) ponerMenu(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') ponerMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 900) ponerMenu(false); });

  // ── Pie de página ──
  if (!script.hasAttribute('data-sin-pie')) {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.insertAdjacentHTML('beforeend',
        '<footer class="pie-sitio">' +
          '<nav aria-label="Enlaces del pie">' + PIE.map(function (op) { return enlaceHTML(op, 'pie-enlace'); }).join('') + '</nav>' +
          '<p>© Juanjo Vergara</p>' +
        '</footer>');
    });
  }
})();
