const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
const navLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];
const sections = Array.from(document.querySelectorAll('main section[id]'));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const intakeForm = document.getElementById('intake-form');
const updateForm = document.getElementById('update-form');

// H-Queex Hub's public lead-intake API. See docs/website-contact-form.html in
// the H-Queex_Hub repo for the endpoint contract (honeypot, CORS, rate limit).
const HQ_LEADS_API_URL = 'https://hub.h-queex.com/api/leads';

function getContentValue(key) {
  const values = window.__HQ_CONTENT_VALUES__ || {};
  return values[key];
}

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isExpanded));
    nav.classList.toggle('open');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}

const revealItems = document.querySelectorAll('.reveal');
if (prefersReducedMotion) {
  revealItems.forEach((item) => item.classList.add('reveal-visible'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -10% 0px',
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

if (navLinks.length > 0 && sections.length > 0) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          const isActive = link.getAttribute('href') === `#${id}`;
          link.classList.toggle('active', isActive);
        });
      });
    },
    {
      threshold: 0.45,
      rootMargin: '-16% 0px -34% 0px',
    }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

const counters = Array.from(document.querySelectorAll('[data-count]'));

function animateCounter(counterEl) {
  const target = Number(counterEl.getAttribute('data-count'));
  if (!Number.isFinite(target)) {
    return;
  }

  const hasPercent = counterEl.textContent.includes('%');
  const hasDays = counterEl.textContent.toLowerCase().includes('d');
  let startTime;
  const duration = 1400;

  function frame(timestamp) {
    if (!startTime) {
      startTime = timestamp;
    }

    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);

    if (hasPercent) {
      counterEl.textContent = `${current}%`;
    } else if (hasDays) {
      counterEl.textContent = `${current}d`;
    } else {
      counterEl.textContent = String(current);
    }

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

if (counters.length > 0 && !prefersReducedMotion) {
  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.5,
    }
  );

  counters.forEach((counter) => counterObserver.observe(counter));
}

if (!prefersReducedMotion) {
  const parallaxItems = Array.from(document.querySelectorAll('[data-parallax]'));

  if (parallaxItems.length > 0) {
    let rafId = null;
    let pointerX = 0;
    let pointerY = 0;

    function renderParallax() {
      parallaxItems.forEach((item) => {
        const depth = Number(item.getAttribute('data-parallax')) || 8;
        const moveX = pointerX / depth;
        const moveY = pointerY / depth;
        item.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
      });

      rafId = null;
    }

    window.addEventListener('pointermove', (event) => {
      pointerX = (event.clientX - window.innerWidth / 2) * 0.06;
      pointerY = (event.clientY - window.innerHeight / 2) * 0.06;

      if (!rafId) {
        rafId = requestAnimationFrame(renderParallax);
      }
    });
  }
}

const yearElement = document.getElementById('year');
if (yearElement) {
  yearElement.textContent = String(new Date().getFullYear());
}

if (intakeForm) {
  intakeForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const success = document.getElementById('form-success');
    const submitButton = intakeForm.querySelector('button[type="submit"]');

    const serviceInterest = Array.from(
      intakeForm.querySelectorAll('input[name="service_interest"]:checked')
    ).map((checkbox) => checkbox.value);

    const payload = {
      company_name: (intakeForm.company_name.value || '').trim(),
      contact_name: (intakeForm.contact_name.value || '').trim(),
      email: (intakeForm.email.value || '').trim(),
      phone: (intakeForm.phone.value || '').trim(),
      message: (intakeForm.message.value || '').trim(),
      service_interest: serviceInterest,
      website_url: intakeForm.website_url.value, // honeypot — must stay empty
    };

    if (success) {
      success.textContent = 'Sending...';
    }
    if (submitButton) {
      submitButton.disabled = true;
    }

    fetch(HQ_LEADS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((response) =>
        response.json().then((data) => ({ ok: response.ok, data }))
      )
      .then((result) => {
        if (success) {
          if (result.ok && result.data.success) {
            success.textContent =
              getContentValue('homeIntakeSuccessMessage') ||
              'Enquiry received and routed to the H-Queex team.';
            intakeForm.reset();
          } else {
            success.textContent =
              result.data.error ||
              getContentValue('homeIntakeErrorMessage') ||
              'Submission failed. Retry, or contact H-Queex directly.';
          }
        }
      })
      .catch(() => {
        if (success) {
          success.textContent =
            getContentValue('homeIntakeErrorMessage') ||
            'Submission failed. Retry, or contact H-Queex directly.';
        }
      })
      .finally(() => {
        if (submitButton) {
          submitButton.disabled = false;
        }
      });
  });
}

if (updateForm) {
  updateForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const success = document.getElementById('update-success');
    const submitButton = updateForm.querySelector('button[type="submit"]');
    const email = (updateForm.email.value || '').trim();

    const payload = {
      // No name field on this form — email doubles as contact_name so the
      // Hub's "contact_name or company_name required" check is satisfied.
      contact_name: email,
      email,
      message: 'Requested the Clarity methodology overview and operational updates.',
      service_interest: [],
      source: 'Website — Update Request',
    };

    if (success) {
      success.textContent = 'Sending...';
    }
    if (submitButton) {
      submitButton.disabled = true;
    }

    fetch(HQ_LEADS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((response) =>
        response.json().then((data) => ({ ok: response.ok, data }))
      )
      .then((result) => {
        if (success) {
          if (result.ok && result.data.success) {
            success.textContent =
              getContentValue('homeUpdateSuccessMessage') ||
              'Request recorded. You will receive updates from H-Queex.';
            updateForm.reset();
          } else {
            success.textContent =
              result.data.error ||
              getContentValue('homeUpdateErrorMessage') ||
              'Request failed. Retry, or contact H-Queex directly.';
          }
        }
      })
      .catch(() => {
        if (success) {
          success.textContent =
            getContentValue('homeUpdateErrorMessage') ||
            'Request failed. Retry, or contact H-Queex directly.';
        }
      })
      .finally(() => {
        if (submitButton) {
          submitButton.disabled = false;
        }
      });
  });
}
