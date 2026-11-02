/* No dependencies, analytics, cookies or backend. All visitor data stays in the browser
   until the visitor chooses to open WhatsApp and send the prepared message. */
'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cover = $('#cover');
  const invitation = $('#invitation');
  const transition = $('#om-transition');
  const openButton = $('#open-invitation');
  const music = $('#wedding-music');
  const musicToggle = $('#music-toggle');
  let opening = false;
  let opened = false;
  let musicManuallyPaused = false;
  let musicPending = false;

  // Quiet audio, best-effort autoplay. Audio failure never gates the invitation.
  music.volume = 0.19;
  function updateMusicControl() {
    const playing = !music.paused && !music.ended;
    musicToggle.textContent = playing ? 'Pause instrumental music' : 'Play instrumental music';
    musicToggle.setAttribute('aria-pressed', String(playing));
  }
  async function tryMusic() {
    if (musicManuallyPaused || musicPending || !music.paused) return;
    musicPending = true;
    try { await music.play(); } catch (_) { /* Expected when browser blocks autoplay. */ }
    finally { musicPending = false; updateMusicControl(); }
  }
  music.addEventListener('play', updateMusicControl);
  music.addEventListener('pause', updateMusicControl);
  music.addEventListener('error', updateMusicControl);
  musicToggle.addEventListener('click', () => {
    if (!music.paused) { musicManuallyPaused = true; music.pause(); }
    else { musicManuallyPaused = false; void tryMusic(); }
  });
  void tryMusic();
  // Retry only on trusted user interactions, without re-enabling manually paused music.
  document.addEventListener('pointerdown', () => { void tryMusic(); }, { passive: true });
  document.addEventListener('keydown', () => { void tryMusic(); });

  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  openButton.addEventListener('click', async () => {
    if (opening || opened) return;
    opening = true;
    openButton.disabled = true;
    // Direct user gesture grants autoplay permission on mobile Safari/Chrome.
    void tryMusic();
    transition.hidden = false;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    transition.classList.add('active');
    await delay(reducedMotion.matches ? 150 : 1650);
    cover.hidden = true;
    invitation.hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!reducedMotion.matches && 'IntersectionObserver' in window) {
      document.documentElement.classList.add('js-motion');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
        });
      }, { threshold: 0.08 });
      document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));
    }
    await delay(reducedMotion.matches ? 0 : 120);
    transition.classList.remove('active');
    await delay(reducedMotion.matches ? 0 : 600);
    transition.hidden = true;
    invitation.focus({ preventScroll: true });
    opening = false;
    opened = true;
  });

  // Explicit UTC offset makes the countdown independent of visitor timezone.
  const weddingTime = Date.parse('2026-11-24T18:30:00+05:30');
  const units = ['days', 'hours', 'minutes', 'seconds'];
  const countdownMessage = $('#countdown-message');
  function updateCountdown() {
    const secondsRemaining = Math.max(0, Math.floor((weddingTime - Date.now()) / 1000));
    const values = [Math.floor(secondsRemaining / 86400), Math.floor(secondsRemaining % 86400 / 3600), Math.floor(secondsRemaining % 3600 / 60), secondsRemaining % 60];
    units.forEach((unit, index) => { $('#' + unit).textContent = String(values[index]).padStart(2, '0'); });
    if (secondsRemaining === 0) countdownMessage.textContent = 'Our wedding celebration has begun. Thank you for your blessings!';
  }
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateCountdown(); });

  if (!reducedMotion.matches) {
    const petals = $('#petals');
    for (let i = 0; i < 11; i += 1) {
      const petal = document.createElement('i');
      petal.className = 'petal';
      petal.style.setProperty('--left', `${(i * 9.7 + 3) % 99}%`);
      petal.style.setProperty('--duration', `${17 + i % 5 * 3}s`);
      petal.style.setProperty('--delay', `${-i * 2.3}s`);
      petals.appendChild(petal);
    }
  }

  const dialog = $('#rsvp-dialog');
  const rsvpButton = $('#rsvp-open');
  const closeButton = $('#rsvp-close');
  const form = $('#rsvp-form');
  const attendance = $('#attendance');
  const guestCount = $('#guest-count');
  const ceremonyFieldset = $('#ceremony-fieldset');
  const ceremonyError = $('#ceremony-error');
  const ceremonies = [...document.querySelectorAll('input[name="ceremonies"]')];
  const fallback = $('#whatsapp-fallback');
  const status = $('#rsvp-status');
  let previousCount = 1;
  rsvpButton.addEventListener('click', () => {
    fallback.hidden = true; status.textContent = '';
    dialog.showModal();
    document.body.classList.add('modal-open');
    // Ensure a comfortable initial scroll position on compact displays.
    dialog.scrollTop = 0;
    $('#guest-name').focus({ preventScroll: true });
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  } });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    rsvpButton.focus({ preventScroll: true });
  });
  // Native <dialog> supplies focus trapping, Escape dismissal and background inertness.
  attendance.addEventListener('change', () => {
    const declining = attendance.value === 'No';
    if (declining && !guestCount.disabled) previousCount = Math.max(1, Number(guestCount.value) || 1);
    guestCount.disabled = declining;
    guestCount.min = declining ? '0' : '1';
    guestCount.value = declining ? '0' : String(previousCount);
    ceremonyFieldset.disabled = declining;
    $('#ceremony-required').hidden = declining;
    ceremonyError.hidden = true;
    guestCount.setCustomValidity('');
  });
  guestCount.addEventListener('input', () => { if (!guestCount.disabled) previousCount = Math.max(1, Number(guestCount.value) || 1); });
  $('#guest-name').addEventListener('input', (event) => event.target.setCustomValidity(''));
  ceremonies.forEach((input) => input.addEventListener('change', () => {
    ceremonyError.hidden = true;
    input.removeAttribute('aria-invalid');
  }));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameInput = $('#guest-name');
    const guestName = nameInput.value.trim();
    if (!guestName) { nameInput.setCustomValidity('Please enter your name.'); nameInput.reportValidity(); return; }
    nameInput.setCustomValidity('');
    if (!form.reportValidity()) return;
    const attending = attendance.value === 'Yes';
    const selected = ceremonies.filter((input) => input.checked).map((input) => input.value);
    if (attending && !selected.length) {
      ceremonyError.hidden = false; ceremonies[0].setAttribute('aria-invalid', 'true'); ceremonies[0].focus(); return;
    }
    const number = attending ? Number(guestCount.value) : 0;
    const message = $('#guest-message').value.trim();
    const lines = [
      'Wedding RSVP', 'Sadanand Verma & Seema Devi', '',
      `Guest name: ${guestName}`, `Will attend: ${attendance.value}`,
      `Number of guests: ${number}`,
      `Ceremonies: ${attending ? selected.join(', ') : 'Not attending'}`,
      `Message: ${message || '—'}`, '',
      'Wedding: Tuesday, 24 November 2026, 6:30 PM IST onwards'
    ];
    const url = `https://wa.me/918318273795?text=${encodeURIComponent(lines.join('\n'))}`;
    fallback.href = url;
    fallback.hidden = false;
    status.textContent = 'Your message is prepared. Please tap Send in WhatsApp to complete your RSVP. If WhatsApp did not open, use the link below.';
    // A synchronous user-initiated open plus a visible fallback handles popup blockers.
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (popup) { try { popup.opener = null; } catch (_) { /* Cross-origin navigation. */ } }
  });
})();
