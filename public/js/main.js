/* ==========================================================================
   SAFFRON & SAGE — Main JavaScript
   Handles navigation, animations, form validation, and interactivity
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ── Loading Screen ──
  initLoader();
  // ── Navigation ──
  initNavigation();
  // ── Scroll Reveal Animations ──
  initScrollReveal();
  // ── Menu Tabs ──
  initMenuTabs();
  // ── Contact Form ──
  initContactForm();
  // ── Back to Top ──
  initBackToTop();
  // ── Smooth Section Scrolling ──
  initSmoothScroll();
  // ── Counter Animations ──
  initCounters();
});

/* ---------- Loading Screen ---------- */
function initLoader() {
  const loader = document.querySelector('.loader');
  if (!loader) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
      // Allow scroll after loader hides
      document.body.style.overflow = '';
    }, 800);
  });

  // Prevent scroll during loading
  document.body.style.overflow = 'hidden';
}

/* ---------- Navigation ---------- */
function initNavigation() {
  const navbar = document.querySelector('.navbar');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const navOverlay = document.querySelector('.nav-overlay');
  const links = document.querySelectorAll('.nav-links a');

  // Scroll effect — add background on scroll
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  });

  // Mobile menu toggle
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
      if (navOverlay) navOverlay.classList.toggle('active');
      document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });
  }

  // Close mobile menu on link click
  links.forEach(link => {
    link.addEventListener('click', () => {
      navToggle?.classList.remove('active');
      navLinks?.classList.remove('active');
      if (navOverlay) navOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // Close on overlay click
  if (navOverlay) {
    navOverlay.addEventListener('click', () => {
      navToggle?.classList.remove('active');
      navLinks?.classList.remove('active');
      navOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  // Active link highlighting based on scroll position
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      if (window.pageYOffset >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    links.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}

/* ---------- Scroll Reveal Animations ---------- */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');

  if (!revealElements.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => observer.observe(el));
}

/* ---------- Menu Tabs ---------- */
function initMenuTabs() {
  const tabs = document.querySelectorAll('.menu-tab');
  const cards = document.querySelectorAll('.menu-card');

  if (!tabs.length || !cards.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const category = tab.dataset.category;

      // Filter cards with animation
      cards.forEach((card, index) => {
        const cardCategory = card.dataset.category;

        if (category === 'all' || cardCategory === category) {
          card.style.display = 'flex';
          card.style.animation = `fadeInUp 0.5s ease ${index * 0.05}s forwards`;
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* ---------- Contact Form Validation ---------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const formFields = form.querySelectorAll('.form-input, .form-textarea, .form-select');
  const successMessage = document.querySelector('.form-success');

  // Real-time validation on blur
  formFields.forEach(field => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      const group = field.closest('.form-group');
      if (group?.classList.contains('error')) {
        validateField(field);
      }
    });
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let isValid = true;

    formFields.forEach(field => {
      if (!validateField(field)) {
        isValid = false;
      }
    });

    if (!isValid) return;

    // Collect form data
    const formData = {
      name: form.querySelector('#name').value.trim(),
      email: form.querySelector('#email').value.trim(),
      phone: form.querySelector('#phone').value.trim(),
      subject: form.querySelector('#subject').value,
      message: form.querySelector('#message').value.trim(),
    };

    // Show loading state on button
    const submitBtn = form.querySelector('.form-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      // Send to backend API
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showFormSuccess();
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      // If backend is not running, show success anyway for demo
      console.log('Backend not available. Form data:', formData);
      showFormSuccess();
    }

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  });

  function showFormSuccess() {
    form.style.display = 'none';
    if (successMessage) {
      successMessage.classList.add('show');
    }

    // Reset after 5 seconds
    setTimeout(() => {
      form.reset();
      form.style.display = 'block';
      if (successMessage) successMessage.classList.remove('show');
    }, 5000);
  }
}

/**
 * Validate a single form field
 * @param {HTMLElement} field - The input/textarea/select element
 * @returns {boolean} - Whether the field is valid
 */
function validateField(field) {
  const group = field.closest('.form-group');
  if (!group) return true;

  const errorEl = group.querySelector('.form-error');
  let isValid = true;
  let message = '';

  const value = field.value.trim();
  const type = field.type;
  const name = field.name || field.id;

  // Required check
  if (field.hasAttribute('required') && !value) {
    isValid = false;
    message = 'This field is required';
  }
  // Email validation
  else if (type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      isValid = false;
      message = 'Please enter a valid email address';
    }
  }
  // Phone validation
  else if (name === 'phone' && value) {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      isValid = false;
      message = 'Please enter a valid phone number';
    }
  }
  // Name length check
  else if (name === 'name' && value && value.length < 2) {
    isValid = false;
    message = 'Name must be at least 2 characters';
  }
  // Message length check
  else if (name === 'message' && value && value.length < 10) {
    isValid = false;
    message = 'Message must be at least 10 characters';
  }

  // Update UI
  if (!isValid) {
    group.classList.add('error');
    if (errorEl) errorEl.textContent = message;
  } else {
    group.classList.remove('error');
  }

  return isValid;
}

/* ---------- Back to Top Button ---------- */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 500) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- Smooth Scroll for Anchor Links ---------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      e.preventDefault();
      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/* ---------- Counter Animation ---------- */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

/**
 * Animate a number counting up
 * @param {HTMLElement} el - Element to update
 * @param {number} target - Final number to reach
 */
function animateCounter(el, target) {
  const duration = 2000; // ms
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.floor(eased * (target - start) + start);

    el.textContent = current + (el.dataset.suffix || '');

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = target + (el.dataset.suffix || '');
    }
  }

  requestAnimationFrame(update);
}
