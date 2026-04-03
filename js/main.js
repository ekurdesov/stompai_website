// Mobile nav toggle
const analytics = window.stompaiAnalytics;
const trackedSectionKeys = new Set();
const trackedVideoSetup = new WeakSet();
const trackedVideoPlayers = new WeakMap();
let youtubeApiReady = null;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function trackEvent(name, params = {}) {
  analytics?.logEvent(name, {
    page_path: window.location.pathname,
    page_name: slugify(document.title),
    ...params,
  });
}

function getTextLabel(element) {
  if (!element) return "";
  return element.textContent.replace(/\s+/g, " ").trim();
}

function getSectionLabel(element) {
  const section = element?.closest("section, article, .support-card, .start-card, .product-card, .promo-content, .app-hero-content");
  if (!section) return "";
  const heading = section.querySelector("h1, h2, h3");
  return getTextLabel(heading || section);
}

function getAppLabel(element) {
  const sectionText = getSectionLabel(element).toLowerCase();
  if (sectionText.includes("doublekick")) return "doublekick";
  if (sectionText.includes("looper")) return "looper";
  if (sectionText.includes("studio")) return "studio";
  return "";
}

function getPlatformFromUrl(url) {
  if (!url) return "";
  if (url.includes("apps.apple.com")) return "ios";
  if (url.includes("play.google.com")) return "android";
  return "";
}

function getYouTubeId(url) {
  const match = String(url || "").match(/embed\/([^?&]+)/);
  return match ? match[1] : "";
}

function getVideoLabel(iframe) {
  const slide = iframe.closest(".video-slide");
  const section = iframe.closest("section");
  const baseName = iframe.dataset.videoName || slide?.dataset.videoName || getTextLabel(section?.querySelector("h2")) || "video";
  const index = slide ? Array.from(slide.parentElement.children).indexOf(slide) + 1 : "";
  const slug = slugify(baseName);
  if (slug === "stompai_in_the_wild" && index) return `${slug}_${index}`;
  return slug || (index ? `video_${index}` : "video");
}

function trackQrLanding() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const qrCode = params.get("qr_code");

  if (window.location.pathname.endsWith("/start.html") || utmSource === "qr" || qrCode) {
    trackEvent("qr_land", {
      utm_source: utmSource || "",
      utm_medium: utmMedium || "",
      utm_campaign: utmCampaign || "",
      qr_code: qrCode || "",
    });
  }
}

function trackSectionViews() {
  const sections = document.querySelectorAll("main section, body > section");
  if (!sections.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.55) return;
      const heading = entry.target.querySelector("h1, h2, h3");
      const label = slugify(getTextLabel(heading) || entry.target.className || "section");
      if (!label || trackedSectionKeys.has(label)) return;
      trackedSectionKeys.add(label);
      trackEvent("section_view", { section_name: label });
      observer.unobserve(entry.target);
    });
  }, { threshold: [0.55] });

  sections.forEach((section) => observer.observe(section));
}

function trackFaqOpen(button) {
  const item = button.parentElement;
  if (!item.classList.contains("open")) {
    trackEvent("faq_open", {
      question: slugify(getTextLabel(button)),
      section_name: "faq",
    });
  }
}

function ensureYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiReady) return youtubeApiReady;

  youtubeApiReady = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === "function") previousReady();
      resolve(window.YT);
    };
  });

  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  }

  return youtubeApiReady;
}

function prepareYouTubeIframe(iframe) {
  const src = iframe.getAttribute("src");
  const dataSrc = iframe.dataset.src;
  const rawUrl = src || dataSrc;
  if (!rawUrl || !rawUrl.includes("youtube.com/embed/")) return false;

  const url = new URL(rawUrl, window.location.origin);
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("origin", window.location.origin);

  if (src) iframe.src = url.toString();
  if (dataSrc) iframe.dataset.src = url.toString();
  if (!iframe.id) iframe.id = `yt-${getYouTubeId(url.toString()) || Math.random().toString(36).slice(2, 9)}`;
  return true;
}

function registerTrackedYouTubeFrame(iframe) {
  if (!iframe || trackedVideoSetup.has(iframe) || !prepareYouTubeIframe(iframe)) return;
  trackedVideoSetup.add(iframe);

  ensureYouTubeApi().then((YT) => {
    if (!YT?.Player || trackedVideoPlayers.has(iframe)) return;

    const videoName = getVideoLabel(iframe);
    const milestonesSent = new Set();
    let progressTimer = null;
    let started = false;

    function clearProgressTimer() {
      if (progressTimer) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }
    }

    function startProgressTimer(player) {
      clearProgressTimer();
      progressTimer = window.setInterval(() => {
        const duration = player.getDuration?.() || 0;
        const currentTime = player.getCurrentTime?.() || 0;
        if (!duration || !currentTime) return;
        [25, 50, 75, 90].forEach((milestone) => {
          if ((currentTime / duration) * 100 >= milestone && !milestonesSent.has(milestone)) {
            milestonesSent.add(milestone);
            trackEvent("video_progress", {
              video_name: videoName,
              video_id: getYouTubeId(iframe.src),
              progress_percent: milestone,
            });
          }
        });
      }, 1500);
    }

    const player = new YT.Player(iframe.id, {
      events: {
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING) {
            if (!started) {
              started = true;
              trackEvent("video_play", {
                video_name: videoName,
                video_id: getYouTubeId(iframe.src),
              });
            }
            startProgressTimer(event.target);
          }

          if (event.data === YT.PlayerState.PAUSED) {
            trackEvent("video_pause", {
              video_name: videoName,
              video_id: getYouTubeId(iframe.src),
            });
            clearProgressTimer();
          }

          if (event.data === YT.PlayerState.ENDED) {
            trackEvent("video_complete", {
              video_name: videoName,
              video_id: getYouTubeId(iframe.src),
            });
            clearProgressTimer();
          }
        },
      },
    });

    trackedVideoPlayers.set(iframe, player);
  }).catch(() => {});
}

function setupTrackedVideos() {
  document.querySelectorAll('.video-section iframe[src*="youtube.com/embed/"], .video-section iframe[data-src*="youtube.com/embed/"]').forEach(registerTrackedYouTubeFrame);
}

function trackLinkAndButtonClicks() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("a, button");
    if (!button) return;

    if (button.matches(".faq-question")) {
      trackFaqOpen(button);
      return;
    }

    const href = button.getAttribute("href") || "";
    const label = slugify(getTextLabel(button) || button.getAttribute("aria-label") || "button");
    const sectionName = slugify(getSectionLabel(button));
    const appName = getAppLabel(button);

    if (button.matches(".carousel-dot")) {
      const carousel = button.closest("[data-carousel]");
      const slide = carousel?.querySelectorAll(".video-slide")[Number(button.dataset.index)];
      const iframe = slide?.querySelector("iframe");
      trackEvent("carousel_navigate", {
        action: "dot",
        video_name: iframe ? getVideoLabel(iframe) : "",
      });
      return;
    }

    if (button.closest(".carousel-controls")) {
      const carousel = button.closest("[data-carousel]");
      const activeSlide = carousel?.querySelector(".video-slide.active iframe");
      trackEvent("carousel_navigate", {
        action: button.hasAttribute("data-prev") ? "previous" : button.hasAttribute("data-next") ? "next" : "dot",
        video_name: activeSlide ? getVideoLabel(activeSlide) : "",
      });
      return;
    }

    if (button.matches("[data-early-access-trigger]")) {
      trackEvent("lead_modal_cta_click", {
        section_name: sectionName,
        app_name: "studio",
      });
      return;
    }

    if (button.closest(".footer-socials")) {
      trackEvent("social_click", {
        network: slugify(button.getAttribute("aria-label") || label),
      });
      return;
    }

    if (button.closest(".press-logo")) {
      trackEvent("press_click", {
        outlet: slugify(button.getAttribute("title") || button.querySelector("img")?.alt || ""),
        link_url: href,
      });
      return;
    }

    if (href.includes("apps.apple.com") || href.includes("play.google.com")) {
      trackEvent("download_click", {
        app_name: appName,
        platform: getPlatformFromUrl(href),
        section_name: sectionName,
      });
      return;
    }

    if (href.includes("square.link")) {
      trackEvent("purchase_intent", {
        item_name: sectionName || label,
        section_name: sectionName,
      });
      return;
    }

    if (href.includes("youtube.com")) {
      trackEvent("social_click", {
        network: "youtube",
      });
      return;
    }

    if (button.closest(".nav-links")) {
      trackEvent("nav_click", {
        destination: href,
        link_name: label,
      });
      return;
    }

    if (button.classList.contains("btn")) {
      trackEvent("cta_click", {
        link_name: label,
        destination: href,
        section_name: sectionName,
        app_name: appName,
      });
    }
  });
}

function setupProductGalleries() {
  document.querySelectorAll("[data-product-gallery]").forEach((gallery) => {
    const mainImage = gallery.querySelector("[data-product-main]");
    const thumbs = gallery.querySelectorAll("[data-product-thumb]");
    if (!mainImage || !thumbs.length) return;

    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        mainImage.src = thumb.dataset.imageSrc || mainImage.src;
        mainImage.alt = thumb.dataset.imageAlt || mainImage.alt;

        thumbs.forEach((node) => node.setAttribute("aria-pressed", "false"));
        thumb.setAttribute("aria-pressed", "true");
        thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      });
    });
  });
}

trackQrLanding();
trackSectionViews();
trackLinkAndButtonClicks();
setupTrackedVideos();
setupProductGalleries();

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
      registerTrackedYouTubeFrame(nextIframe);
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
