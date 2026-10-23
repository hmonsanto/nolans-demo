/* Nolan's · Google Analytics (GA4) con consentimiento previo
 *
 * - NO se carga nada de Google hasta que la persona pulsa "Aceptar". Si rechaza
 *   (o no decide), no se instala ninguna cookie ni se manda nada a Google.
 * - La decisión se guarda en este navegador (localStorage) y se puede cambiar
 *   desde "Configuración de cookies" en el pie de página.
 * - Las señales de Google (publicidad personalizada) están desactivadas.
 * - Vive en un archivo externo porque la CSP no permite scripts inline. El ID
 *   llega en data-ga-id del propio <script>; si está vacío, no hace nada.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var gaId = script && script.getAttribute('data-ga-id');
  if (!gaId) return;

  var KEY = 'nolans_consent'; // 'granted' | 'denied'
  var cargado = false;
  var banner = null;
  var origen = null;

  function leer() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* se vuelve a preguntar */ } }

  function cargarAnalytics() {
    if (cargado) return;
    cargado = true;
    window['ga-disable-' + gaId] = false;
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaId, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
    document.head.appendChild(tag);
  }

  function borrarCookiesAnalytics() {
    window['ga-disable-' + gaId] = true;
    var nombres = document.cookie.split(';')
      .map(function (c) { return c.split('=')[0].trim(); })
      .filter(function (n) { return n === '_ga' || n.indexOf('_ga_') === 0 || n === '_gid' || n.indexOf('_gat') === 0; });
    var partes = location.hostname.split('.');
    var dominios = ['', location.hostname];
    for (var i = 0; i < partes.length - 1; i++) dominios.push('.' + partes.slice(i).join('.'));
    nombres.forEach(function (n) {
      dominios.forEach(function (d) {
        document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function cerrar() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
    if (origen && document.body.contains(origen)) origen.focus();
    origen = null;
  }

  function decidir(valor) {
    guardar(valor);
    if (valor === 'granted') cargarAnalytics(); else borrarCookiesAnalytics();
    cerrar();
  }

  function crear(tag, clase, texto) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto) el.textContent = texto;
    return el;
  }

  function mostrar(desdeUsuario) {
    if (banner) return;
    banner = crear('section', 'cookie-banner');
    banner.setAttribute('aria-label', 'Aviso de cookies');

    var dentro = crear('div', 'cookie-banner-inner');
    var p = crear('p');
    p.appendChild(document.createTextNode(
      'Usamos Google Analytics para saber cuántas personas visitan el sitio y qué páginas ven. ' +
      'Solo se activa si lo aceptas y puedes cambiar de opinión cuando quieras. '
    ));
    var a = crear('a', '', 'Más información');
    a.href = '/cookies.html';
    p.appendChild(a);
    p.appendChild(document.createTextNode('.'));

    var acciones = crear('div', 'cookie-actions');
    var rechazar = crear('button', 'btn btn-borde-claro', 'Rechazar');
    rechazar.type = 'button';
    rechazar.addEventListener('click', function () { decidir('denied'); });
    var aceptar = crear('button', 'btn btn-ambar', 'Aceptar');
    aceptar.type = 'button';
    aceptar.addEventListener('click', function () { decidir('granted'); });
    acciones.appendChild(rechazar);
    acciones.appendChild(aceptar);

    dentro.appendChild(p);
    dentro.appendChild(acciones);
    banner.appendChild(dentro);
    // Justo después del enlace "Saltar al contenido", que debe seguir siendo lo primero.
    var saltar = document.body.querySelector('.skip-link');
    var despues = saltar && saltar.parentNode === document.body ? saltar.nextSibling : document.body.firstChild;
    document.body.insertBefore(banner, despues);
    if (desdeUsuario) aceptar.focus();
  }

  function iniciar() {
    var eleccion = leer();
    if (eleccion === 'granted') {
      cargarAnalytics();
    } else {
      borrarCookiesAnalytics();
      if (eleccion !== 'denied') mostrar(false);
    }

    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-cookie-settings]');
      if (!b) return;
      e.preventDefault();
      origen = b;
      mostrar(true);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
