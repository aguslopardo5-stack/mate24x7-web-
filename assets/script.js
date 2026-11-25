function initMate24x7() {

  /* ---------- AOS ---------- */
  if (window.AOS) {
    AOS.init({ duration: 700, once: true, offset: 60, easing: 'ease-out-cubic' });
  }

  /* ---------- Navbar on scroll ---------- */
  const nav = document.getElementById('mainNav');
  function onScrollNav() {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Live badge rotating messages ---------- */
  const liveMessages = [
    'Funcionando 24x7',
    '30% de cada venta para tu local',
    'Mantenimiento a cargo nuestro',
    'Agua de red, sin bidones',
    'Ya instaladas en Saladillo'
  ];
  let liveIdx = 0;
  const liveTextEl = document.getElementById('liveText');
  if (liveTextEl) {
    setInterval(() => {
      liveIdx = (liveIdx + 1) % liveMessages.length;
      liveTextEl.style.opacity = 0;
      setTimeout(() => {
        liveTextEl.textContent = liveMessages[liveIdx];
        liveTextEl.style.opacity = 1;
      }, 250);
    }, 3200);
    liveTextEl.style.transition = 'opacity .25s ease';
  }

  /* ---------- Calendario de disponibilidad ----------
     MODO 1 (por defecto, ya funciona sin hacer nada):
     Para marcar una fecha como reservada a mano, agregá el string
     "YYYY-MM-DD" al array BOOKED_DATES de abajo.
     Ejemplo: si el 14 de agosto de 2026 ya está reservado,
     agregá "2026-08-14".

     MODO 2 (automático desde tu Google Calendar):
     Si cargás CALENDAR_ID y API_KEY más abajo y ponés enabled: true,
     la web va a leer las fechas ocupadas directo de ese calendario
     de Google (además de las que pongas a mano en BOOKED_DATES).
     Así no tenés que tocar este archivo nunca más: solo agregás el
     evento en Google Calendar desde el celu y se refleja solo. */
  const BOOKED_DATES = [
    '2026-08-14',
    '2026-08-15',
    '2026-09-05',
    '2026-09-19',
    '2026-09-20',
  ];

  const GOOGLE_CALENDAR = {
    enabled: true,
    calendarId: '8f284b081dbed7530f2f233cac361f5d26ea948fe169c574f6bb97d19725b2c4@group.calendar.google.com',
    apiKey: 'AIzaSyAg9oQq0AhZ_uvbFf-6PCjjEKzDWBZIRm0',
  };

  const WHATSAPP_NUMBER = '542344438234';
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const calGrid = document.getElementById('calGrid');
  const calMonthLabel = document.getElementById('calMonthLabel');
  const calNote = document.getElementById('calSelectedNote');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');

  if (calGrid) {
    const today = new Date();
    today.setHours(0,0,0,0);
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();
    const minMonth = { y: today.getFullYear(), m: today.getMonth() };
    let requestToken = 0; // evita pisar el render si cambian de mes rápido

    function pad2(n) {
      return n < 10 ? '0' + n : String(n);
    }

    function fmtDate(y, m, d) {
      return y + '-' + pad2(m + 1) + '-' + pad2(d);
    }

    // Trae, para un mes dado, el set de fechas "YYYY-MM-DD" ocupadas
    // según Google Calendar (si está activado) + la lista manual.
    async function getBookedDatesForMonth(year, month) {
      const manual = new Set(BOOKED_DATES);

      if (!GOOGLE_CALENDAR.enabled) return manual;

      try {
        const timeMin = new Date(year, month, 1).toISOString();
        const timeMax = new Date(year, month + 1, 1).toISOString();
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR.calendarId)}/events` +
          `?key=${GOOGLE_CALENDAR.apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Google Calendar API respondió ' + res.status);
        const data = await res.json();

        (data.items || []).forEach(ev => {
          if (ev.start && ev.start.date) {
            // Evento de día completo: puede abarcar varios días
            const start = new Date(ev.start.date + 'T00:00:00');
            const end = new Date((ev.end && ev.end.date ? ev.end.date : ev.start.date) + 'T00:00:00');
            for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
              manual.add(fmtDate(d.getFullYear(), d.getMonth(), d.getDate()));
            }
          } else if (ev.start && ev.start.dateTime) {
            const d = new Date(ev.start.dateTime);
            manual.add(fmtDate(d.getFullYear(), d.getMonth(), d.getDate()));
          }
        });
      } catch (err) {
        console.warn('No se pudo leer Google Calendar, muestro solo la lista manual.', err);
      }

      return manual;
    }

    async function renderCalendar(year, month) {
      const myToken = ++requestToken;
      calGrid.classList.add('is-loading');

      const bookedSet = await getBookedDatesForMonth(year, month);
      if (myToken !== requestToken) return; // el usuario ya cambió de mes de nuevo

      calGrid.classList.remove('is-loading');
      calGrid.innerHTML = '';
      calMonthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

      const firstDay = new Date(year, month, 1);
      // Monday-first index (0 = Monday ... 6 = Sunday)
      let startIdx = (firstDay.getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < startIdx; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day cal-empty';
        calGrid.appendChild(empty);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        const dateObj = new Date(year, month, d);
        dateObj.setHours(0,0,0,0);
        const iso = fmtDate(year, month, d);
        const isPast = dateObj < today;
        const isToday = dateObj.getTime() === today.getTime();
        const isBooked = bookedSet.has(iso);

        cell.textContent = d;
        cell.classList.add('cal-day');

        if (isPast) {
          cell.classList.add('cal-past');
        } else if (isBooked) {
          cell.classList.add('cal-booked');
          cell.title = 'Fecha reservada';
        } else {
          cell.classList.add('cal-available');
          if (isToday) cell.classList.add('cal-today');
          cell.addEventListener('click', () => {
            const niceDate = dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
            calNote.textContent = `Consultando por el ${niceDate}...`;
            calNote.classList.add('is-link');
            const msg = encodeURIComponent(`Hola! Quiero consultar disponibilidad para el ${niceDate} para mi evento.`);
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
          });
        }
        calGrid.appendChild(cell);
      }
    }

    function isAtMin(year, month) {
      return year === minMonth.y && month === minMonth.m;
    }

    calPrev.addEventListener('click', () => {
      if (isAtMin(viewYear, viewMonth)) return;
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      renderCalendar(viewYear, viewMonth);
    });
    calNext.addEventListener('click', () => {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderCalendar(viewYear, viewMonth);
    });

    renderCalendar(viewYear, viewMonth);
  }

  /* ---------- Stat counters (animate on scroll into view) ---------- */
  const counters = document.querySelectorAll('.stat-number');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count'), 10);
        let current = 0;
        const duration = 1200;
        const stepTime = 16;
        const steps = duration / stepTime;
        const increment = target / steps;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = Math.floor(current);
        }, stepTime);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => counterObserver.observe(c));

  /* ---------- Video de la galería: sonido + pausa fuera de pantalla ----------
     Se usa delegación de eventos para que también funcione en los slides
     que Swiper duplica cuando el carrusel está en modo loop. */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest ? e.target.closest('.video-sound') : null;
    if (!btn) return;
    e.stopPropagation();
    const video = btn.parentNode.querySelector('video');
    if (!video) return;
    video.muted = !video.muted;
    btn.querySelector('i').className = video.muted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
    btn.setAttribute('aria-label', video.muted ? 'Activar sonido' : 'Silenciar');
    if (!video.muted && video.paused) video.play();
  });

  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          const pr = en.target.play();
          if (pr && pr.catch) pr.catch(function () {});
        }
        else { en.target.pause(); }
      });
    }, { threshold: 0.25 });
    // setTimeout 0: espera a que Swiper termine de clonar los slides del loop
    setTimeout(function () {
      document.querySelectorAll('.gallery-video video').forEach(function (v) { videoObserver.observe(v); });
    }, 0);
  }

  /* ---------- Formulario de contacto: arma el mensaje y abre WhatsApp ---------- */
  const leadForm = document.getElementById('leadForm');
  if (leadForm) {
    const fNombre = document.getElementById('leadNombre');
    const fCiudad = document.getElementById('leadCiudad');
    const fTipo = document.getElementById('leadTipo');
    const fError = document.getElementById('leadError');
    leadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const nombre = fNombre.value.trim();
      const ciudad = fCiudad.value.trim();
      const tipo = fTipo.value;
      [[fNombre, nombre], [fCiudad, ciudad], [fTipo, tipo]].forEach(function (par) {
        par[0].classList.toggle('is-invalid', !par[1]);
      });
      if (!nombre || !ciudad || !tipo) {
        fError.hidden = false;
        return;
      }
      fError.hidden = true;
      const msg = 'Hola! Soy ' + nombre + '. Tengo un local en ' + ciudad +
        ' (tipo de negocio: ' + tipo + ') y quiero una máquina Mate24x7.';
      window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
    });
  }

  /* ---------- Barra 30/70: se anima al entrar en pantalla ---------- */
  const dealBar = document.getElementById('dealBar');
  if (dealBar) {
    if ('IntersectionObserver' in window) {
      const dealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { dealBar.classList.add('in-view'); dealObserver.unobserve(dealBar); }
        });
      }, { threshold: 0.4 });
      dealObserver.observe(dealBar);
    }
  }

  /* ---------- Swiper: Gallery ---------- */
  if (window.Swiper) {
    const gallerySlides = document.querySelectorAll('.gallery-swiper .swiper-slide').length;
    new Swiper('.gallery-swiper', {
      slidesPerView: 'auto',
      spaceBetween: 20,
      loop: gallerySlides > 4, // el loop necesita suficientes slides; con pocos queda desactivado
      centeredSlides: false,
      navigation: {
        nextEl: '.gallery-swiper .swiper-button-next',
        prevEl: '.gallery-swiper .swiper-button-prev',
      },
      breakpoints: {
        0: { spaceBetween: 12 },
        768: { spaceBetween: 20 }
      }
    });

    if (document.querySelector('.testimonial-swiper')) {
      new Swiper('.testimonial-swiper', {
        slidesPerView: 1,
        spaceBetween: 24,
        loop: true,
        pagination: { el: '.testimonial-swiper .swiper-pagination', clickable: true },
        breakpoints: {
          768: { slidesPerView: 2 },
          1200: { slidesPerView: 3 }
        }
      });
    }
  }

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMate24x7);
} else {
  initMate24x7();
}

