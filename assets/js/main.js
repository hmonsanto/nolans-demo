/* Nolan's Landscaping & Handyman's · JavaScript del sitio
 * Sin dependencias. Todo vive en este archivo externo porque la CSP no permite
 * JavaScript en línea.
 *   1. Menú móvil
 *   2. Carrusel del hero
 *   3. Revelado al hacer scroll
 *   4. Visor de fotos (lightbox)
 *   5. Estado "abierto / cerrado" del horario
 *   6. Formulario de estimado → WhatsApp
 */
(function () {
  'use strict';

  var reducirMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 1. Menú móvil ----------
  var botonMenu = document.querySelector('.menu-boton');
  var menu = document.getElementById('menu-principal');
  if (botonMenu && menu) {
    var cerrarMenu = function () {
      botonMenu.setAttribute('aria-expanded', 'false');
      menu.classList.remove('abierto');
    };
    botonMenu.addEventListener('click', function () {
      var abierto = botonMenu.getAttribute('aria-expanded') === 'true';
      botonMenu.setAttribute('aria-expanded', String(!abierto));
      menu.classList.toggle('abierto', !abierto);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) cerrarMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('abierto')) {
        cerrarMenu();
        botonMenu.focus();
      }
    });
  }

  // ---------- 2. Carrusel ----------
  var ss = document.querySelector('.slideshow');
  if (ss) {
    var slides = Array.prototype.slice.call(ss.querySelectorAll('.slide'));
    var puntos = Array.prototype.slice.call(ss.querySelectorAll('.ss-punto'));
    var lista = ss.querySelector('.slides');
    var btnPausa = ss.querySelector('.ss-pausa');
    var indice = 0;
    var temporizador = null;
    var pausadoPorUsuario = reducirMovimiento; // con "reducir movimiento" no arranca solo
    var pausadoPorPuntero = false;

    var mostrar = function (i) {
      indice = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        var activa = n === indice;
        s.classList.toggle('activa', activa);
        if (activa) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
      });
      puntos.forEach(function (p, n) { p.classList.toggle('activa', n === indice); });
    };

    var actualizarBotonPausa = function () {
      if (!btnPausa) return;
      btnPausa.setAttribute('aria-label', pausadoPorUsuario ? 'Reanudar carrusel' : 'Pausar carrusel');
      var uso = btnPausa.querySelector('use');
      if (uso) uso.setAttribute('href', pausadoPorUsuario ? '#i-play' : '#i-pausa');
      // Mientras avanza solo, el lector de pantalla no debe anunciar cada cambio.
      if (lista) lista.setAttribute('aria-live', pausadoPorUsuario ? 'polite' : 'off');
    };

    var detener = function () { if (temporizador) { clearInterval(temporizador); temporizador = null; } };
    var arrancar = function () {
      detener();
      if (pausadoPorUsuario || pausadoPorPuntero || slides.length < 2) return;
      temporizador = setInterval(function () { mostrar(indice + 1); }, 5500);
    };

    ss.querySelector('.ss-prev').addEventListener('click', function () { mostrar(indice - 1); arrancar(); });
    ss.querySelector('.ss-next').addEventListener('click', function () { mostrar(indice + 1); arrancar(); });
    if (btnPausa) {
      btnPausa.addEventListener('click', function () {
        pausadoPorUsuario = !pausadoPorUsuario;
        actualizarBotonPausa();
        arrancar();
      });
    }
    ss.addEventListener('mouseenter', function () { pausadoPorPuntero = true; arrancar(); });
    ss.addEventListener('mouseleave', function () { pausadoPorPuntero = false; arrancar(); });
    ss.addEventListener('focusin', function () { pausadoPorPuntero = true; arrancar(); });
    ss.addEventListener('focusout', function () { pausadoPorPuntero = false; arrancar(); });
    ss.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { mostrar(indice - 1); arrancar(); }
      if (e.key === 'ArrowRight') { mostrar(indice + 1); arrancar(); }
    });

    // Deslizar con el dedo
    var xInicio = null;
    ss.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') xInicio = e.clientX; });
    ss.addEventListener('pointerup', function (e) {
      if (xInicio === null) return;
      var dx = e.clientX - xInicio;
      xInicio = null;
      if (Math.abs(dx) > 40) { mostrar(indice + (dx < 0 ? 1 : -1)); arrancar(); }
    });

    // Las demás fotos cargan cuando la página termina, para que no haya huecos al pasar.
    window.addEventListener('load', function () {
      slides.forEach(function (s) {
        var img = s.querySelector('img');
        if (img) img.loading = 'eager';
      });
    });

    actualizarBotonPausa();
    arrancar();
  }

  // ---------- 3. Revelado al hacer scroll ----------
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window && !reducirMovimiento) {
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('visible');
            obs.unobserve(en.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(function (el) { obs.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('visible'); });
    }
  }

  // ---------- 4. Visor de fotos ----------
  var visor = document.querySelector('dialog.lightbox');
  if (visor && typeof visor.showModal === 'function') {
    var visorImg = visor.querySelector('.lightbox-img');
    var grupo = [];
    var pos = 0;
    var disparador = null;

    var cargarFoto = function (i) {
      pos = (i + grupo.length) % grupo.length;
      var b = grupo[pos];
      visorImg.src = b.getAttribute('data-ampliar');
      visorImg.alt = b.getAttribute('data-alt') || '';
    };

    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-ampliar]');
      if (!b) return;
      var contenedor = b.closest('ul') || document;
      // Solo las fotos visibles (si hay un filtro de galería activo, las ocultas no cuentan).
      grupo = Array.prototype.slice.call(contenedor.querySelectorAll('[data-ampliar]'))
        .filter(function (x) { return !x.closest('[hidden]'); });
      disparador = b;
      visor.classList.toggle('lightbox-solo', grupo.length < 2);
      cargarFoto(grupo.indexOf(b));
      visor.showModal();
    });

    visor.querySelector('.lightbox-cerrar').addEventListener('click', function () { visor.close(); });
    var prev = visor.querySelector('.lightbox-prev');
    var next = visor.querySelector('.lightbox-next');
    if (prev) prev.addEventListener('click', function () { cargarFoto(pos - 1); });
    if (next) next.addEventListener('click', function () { cargarFoto(pos + 1); });
    visor.addEventListener('click', function (e) { if (e.target === visor) visor.close(); }); // clic en el fondo
    visor.addEventListener('keydown', function (e) {
      if (grupo.length < 2) return;
      if (e.key === 'ArrowLeft') cargarFoto(pos - 1);
      if (e.key === 'ArrowRight') cargarFoto(pos + 1);
    });
    visor.addEventListener('close', function () {
      visorImg.removeAttribute('src');
      if (disparador && document.body.contains(disparador)) disparador.focus();
    });
  }

  // ---------- 5. Estado del horario ----------
  var estado = document.querySelector('[data-estado]');
  var filas = document.querySelectorAll('#horario tbody tr[data-dias]');
  if (estado && filas.length && window.Intl && Intl.DateTimeFormat) {
    try {
      var partes = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Puerto_Rico', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(new Date());
      var obj = {};
      partes.forEach(function (p) { obj[p.type] = p.value; });
      var dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(obj.weekday);
      var minutos = (parseInt(obj.hour, 10) % 24) * 60 + parseInt(obj.minute, 10);
      var abierto = false;
      filas.forEach(function (tr) {
        var dias = tr.getAttribute('data-dias').split(',').map(Number);
        if (dias.indexOf(dow) === -1) return;
        tr.classList.add('hoy');
        var a = tr.getAttribute('data-abre');
        var c = tr.getAttribute('data-cierra');
        if (a && c) {
          var ma = parseInt(a.slice(0, 2), 10) * 60 + parseInt(a.slice(3), 10);
          var mc = parseInt(c.slice(0, 2), 10) * 60 + parseInt(c.slice(3), 10);
          abierto = minutos >= ma && minutos < mc;
        }
      });
      estado.textContent = abierto ? 'Abierto ahora' : 'Cerrado ahora';
      estado.classList.add(abierto ? 'estado-abierto' : 'estado-cerrado');
      estado.hidden = false;
    } catch (err) { /* sin Intl: simplemente no se muestra el estado */ }
  }

  // ---------- 7. Comparador de antes y después ----------
  document.querySelectorAll('[data-comparador]').forEach(function (c) {
    var rango = c.querySelector('.comp-rango');
    if (!rango) return;
    var poner = function () { c.style.setProperty('--pos', rango.value + '%'); };
    rango.addEventListener('input', poner);
    poner();
  });

  // ---------- 8. Filtros de la galería ----------
  var botonesFiltro = document.querySelectorAll('.filtro');
  if (botonesFiltro.length) {
    botonesFiltro.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = btn.getAttribute('data-filtro');
        botonesFiltro.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        document.querySelectorAll('[data-galeria] > li').forEach(function (li) {
          li.hidden = !(f === 'todos' || li.getAttribute('data-cat') === f);
        });
      });
    });
  }

  // ---------- 6. Formulario → WhatsApp ----------
  var form = document.getElementById('estimado-form');
  if (form) {
    var WHATSAPP = '17873751077';
    var errorBox = document.getElementById('form-error');
    var okBox = document.getElementById('form-ok');
    var okLink = document.getElementById('form-ok-link');

    var limpiar = function (v) { return String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(); };
    var marcar = function (campo, malo) {
      campo.classList.toggle('invalido', malo);
      campo.setAttribute('aria-invalid', String(malo));
    };
    var telefonoValido = function (v) {
      var d = String(v).replace(/\D/g, '');
      return d.length === 10 || (d.length === 11 && d.charAt(0) === '1');
    };
    var mostrarError = function (msg, campo) {
      if (okBox) okBox.hidden = true;
      errorBox.textContent = msg;
      errorBox.hidden = false;
      if (campo) campo.focus();
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var el = form.elements;

      // Trampa para bots: un humano nunca ve este campo.
      if (el.web && el.web.value) return;

      var nombre = limpiar(el.nombre.value);
      var direccion = limpiar(el.direccion.value);
      var telefono = limpiar(el.telefono.value);
      var servicio = limpiar(el.servicio.value);

      var faltan = [];
      [[el.nombre, !nombre], [el.direccion, !direccion], [el.telefono, !telefono || !telefonoValido(telefono)]]
        .forEach(function (par) { marcar(par[0], par[1]); if (par[1]) faltan.push(par[0]); });

      if (faltan.length) {
        var tel = faltan[0] === el.telefono && telefono;
        mostrarError(tel ? 'Revisa el teléfono: debe tener 10 dígitos (ej. 787-000-0000).' : 'Completa los campos marcados con * para armar tu mensaje.', faltan[0]);
        return;
      }
      if (!el.acepto.checked) {
        mostrarError('Debes aceptar la política de privacidad y los términos para continuar.', el.acepto);
        return;
      }
      errorBox.hidden = true;

      // Constancia de aceptación (solo nombre y servicio; ver /api/registrar-aceptacion).
      try {
        fetch('/api/registrar-aceptacion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origen: 'estimado', nombre: nombre, servicio: servicio }),
          keepalive: true
        }).catch(function () {});
      } catch (err) { /* no-op */ }

      // El saludo cambia según la línea del negocio (Landscaping & Handyman's / Design's & More).
      var lineas = [form.getAttribute('data-saludo') || "Hola Nolan's, quiero un estimado gratis:"];
      lineas.push('• Nombre: ' + nombre);
      lineas.push('• Dirección/sector del trabajo: ' + direccion);
      lineas.push('• Teléfono: ' + telefono);
      if (servicio) lineas.push('• Servicio: ' + servicio);
      lineas.push('Les envío fotos por aquí. ¡Gracias!');

      var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lineas.join('\n'));

      // Siempre se muestra un enlace de respaldo: si el navegador bloquea la
      // ventana nueva, la persona lo toca y listo. (Con 'noopener' window.open
      // devuelve siempre null, por eso no se usa esa opción ni se redirige la
      // página: se corta la relación con la ventana nueva a mano.)
      if (okBox && okLink) {
        okLink.href = url;
        okBox.hidden = false;
      }
      try {
        var w = window.open(url, '_blank');
        if (w) w.opener = null;
      } catch (err) { /* el enlace de respaldo cubre este caso */ }
    });

    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.classList && t.classList.contains('invalido') && limpiar(t.value)) marcar(t, false);
    });
  }
})();
