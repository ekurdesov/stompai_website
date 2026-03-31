// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
  });
}

// Close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const answer = item.querySelector('.faq-answer');
    const isOpen = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-answer').style.maxHeight = null;
    });

    // Open clicked if it was closed
    if (!isOpen) {
      item.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// Video carousel
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const slides = carousel.querySelectorAll('.video-slide');
  const dots = carousel.querySelectorAll('.carousel-dot');
  const prevBtn = carousel.querySelector('[data-prev]');
  const nextBtn = carousel.querySelector('[data-next]');
  let current = 0;

  // Store video URLs for each slide
  slides.forEach(slide => {
    const iframe = slide.querySelector('iframe');
    if (iframe) {
      slide.dataset.videoUrl = iframe.src || iframe.dataset.src || '';
    }
  });

  function goTo(index) {
    // Stop current video by removing src
    const currentIframe = slides[current].querySelector('iframe');
    if (currentIframe) {
      currentIframe.src = 'about:blank';
    }

    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');

    current = (index + slides.length) % slides.length;

    // Load the next video
    const nextIframe = slides[current].querySelector('iframe');
    if (nextIframe && slides[current].dataset.videoUrl) {
      nextIframe.src = slides[current].dataset.videoUrl;
    }

    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));
  dots.forEach(dot => {
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index)));
  });
});

// Header scroll effect
const header = document.querySelector('.site-header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.scrollY;
  if (currentScroll > 50) {
    header.style.borderBottomColor = 'rgba(42, 42, 58, 0.8)';
  } else {
    header.style.borderBottomColor = 'var(--border)';
  }
  lastScroll = currentScroll;
});

// Countdown timers
document.querySelectorAll('[data-countdown]').forEach(countdown => {
  const target = new Date(countdown.dataset.countdown);
  const daysEl = countdown.querySelector('[data-days]');
  const hoursEl = countdown.querySelector('[data-hours]');
  const minutesEl = countdown.querySelector('[data-minutes]');
  const secondsEl = countdown.querySelector('[data-seconds]');

  if (Number.isNaN(target.getTime())) return;

  function render() {
    const diff = Math.max(0, target.getTime() - Date.now());
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = String(days);
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  render();
  window.setInterval(render, 1000);
});

// Smart app store links for DoubleKick and Looper
const iosStoreUrl = 'https://apps.apple.com/us/app/stompai-foot-drum-stomp-box/id1208994707';
const androidStoreUrl = 'https://play.google.com/store/apps/details?id=com.stompai.kick';
const userAgent = navigator.userAgent || navigator.vendor || window.opera;
const isAndroid = /android/i.test(userAgent);
const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const preferredStoreUrl = isAndroid ? androidStoreUrl : iosStoreUrl;

document.querySelectorAll('[data-smart-store]').forEach(link => {
  link.href = preferredStoreUrl;
});
