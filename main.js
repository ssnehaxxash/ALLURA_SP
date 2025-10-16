// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 ALLURA website loading...');
  
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Hamburger menu toggle
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', function() {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
  }

  // Close mobile menu when clicking nav links
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (hamburger && navMenu) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  });

  // Smooth scrolling for navigation links
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      
      if (targetSection) {
        const offsetTop = targetSection.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });

  // Enhanced navbar background on scroll
  let lastScrollY = 0;
  window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    const currentScrollY = window.scrollY;
    
    if (navbar) {
      if (currentScrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
      } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
      }
      
      // Hide navbar on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        navbar.style.transform = 'translateY(-100%)';
      } else {
        navbar.style.transform = 'translateY(0)';
      }
      lastScrollY = currentScrollY;
    }
  });

  // Enhanced scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  // Add animation classes and observe elements
  const animateElements = document.querySelectorAll(
    '.feature-card, .category-card, .section-header, .hero-stats, .cta-content'
  );

  animateElements.forEach((el, index) => {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  // Category card click handlers with enhanced feedback
  const categoryCards = document.querySelectorAll('.category-card');
  categoryCards.forEach(card => {
    card.addEventListener('click', function() {
      const category = this.dataset.category;
      
      // Add click effect
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 150);
      
      // Show notification
      showNotification(`${category.charAt(0).toUpperCase() + category.slice(1)} specialized features coming soon!`, 'info');
    });
  });

  // Enhanced button click handlers
  const startButtons = document.querySelectorAll('.btn-hero-primary, .btn-cta-primary');
  startButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      showNotification('Sign-up functionality coming soon! 🚀', 'success');
    });
  });

  const demoButtons = document.querySelectorAll('.btn-hero-secondary, .btn-cta-secondary');
  demoButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      showNotification('Interactive demo coming soon! 🎬', 'info');
    });
  });

  // ALLURA text letter-by-letter animation
  function animateALLURAText() {
    const animatedText = document.querySelector('.animated-text');
    if (animatedText && !animatedText.hasAttribute('data-animated')) {
      const text = 'ALLURA';
      animatedText.innerHTML = '';
      animatedText.setAttribute('data-animated', 'true');
      
      [...text].forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.transform = 'translateY(50px) rotateX(90deg)';
        span.style.transition = 'all 0.8s ease';
        span.style.transitionDelay = `${index * 0.1}s`;
        animatedText.appendChild(span);
        
        setTimeout(() => {
          span.style.opacity = '1';
          span.style.transform = 'translateY(0) rotateX(0)';
        }, 100 + (index * 100));
      });
    }
  }

  // Trigger ALLURA animation after a short delay
  setTimeout(animateALLURAText, 500);

  // Parallax effect for hero section
  window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.3;
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
      heroContent.style.transform = `translateY(${rate}px)`;
    }
  });

  // Stats counter animation
  function animateStatsCounters() {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
      const text = stat.textContent;
      const number = parseInt(text.replace(/[^0-9]/g, ''));
      const suffix = text.replace(/[0-9]/g, '');
      
      let current = 0;
      const increment = number / 50;
      const timer = setInterval(() => {
        current += increment;
        if (current >= number) {
          current = number;
          clearInterval(timer);
        }
        stat.textContent = Math.floor(current) + suffix;
      }, 40);
    });
  }

  // Trigger stats animation when they come into view
  const statsObserver = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateStatsCounters();
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    statsObserver.observe(heroStats);
  }

  // Enhanced feature card interactions
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-15px) scale(1.02)';
      this.style.zIndex = '10';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
      this.style.zIndex = '1';
    });
  });

  // Notification system
  function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(container);
    }

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      background: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(33, 150, 243, 0.9)'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-weight: 500;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      cursor: pointer;
      max-width: 300px;
    `;

    container.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);

    // Click to dismiss
    notification.addEventListener('click', () => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }

  // Loading states for future API calls
  window.showLoading = function(element) {
    element.style.opacity = '0.6';
    element.style.pointerEvents = 'none';
    element.style.cursor = 'not-allowed';
  };

  window.hideLoading = function(element) {
    element.style.opacity = '1';
    element.style.pointerEvents = 'auto';
    element.style.cursor = 'pointer';
  };

  // Performance optimization: Throttle scroll events
  let ticking = false;
  function updateScrollEffects() {
    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(updateScrollEffects);
      ticking = true;
    }
  });

  // Keyboard navigation support
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      // Close mobile menu
      if (hamburger && navMenu) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      }
    }
  });

  // Add focus styles for accessibility
  const focusableElements = document.querySelectorAll('button, a, input, select, textarea');
  focusableElements.forEach(element => {
    element.addEventListener('focus', function() {
      this.style.outline = '2px solid #5227FF';
      this.style.outlineOffset = '2px';
    });
    
    element.addEventListener('blur', function() {
      this.style.outline = 'none';
    });
  });

  console.log('✨ ALLURA website fully loaded and interactive!');
});

// Global utilities for future use
window.ALLURA = {
  // Analytics tracking (placeholder)
  track: function(event, properties) {
    console.log('📊 Analytics:', event, properties);
    // Future: Send to analytics service
  },

  // API helpers (placeholder)
  api: {
    get: async function(endpoint) {
      console.log('🌐 API GET:', endpoint);
      // Future: API integration
      return { success: true, data: {} };
    },
    
    post: async function(endpoint, data) {
      console.log('🌐 API POST:', endpoint, data);
      // Future: API integration
      return { success: true, data: {} };
    }
  },

  // User management (placeholder)
  user: {
    login: function(credentials) {
      console.log('🔐 Login attempt:', credentials);
      // Future: Authentication
      return { success: true, user: {} };
    },
    
    signup: function(userData) {
      console.log('📝 Signup attempt:', userData);
      // Future: Registration
      return { success: true, user: {} };
    }
  },

  // Theme management
  theme: {
    toggle: function() {
      document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    },
    
    init: function() {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
      }
    }
  }
};

// Initialize theme
window.ALLURA.theme.init();
document.addEventListener('DOMContentLoaded', function() {
    // Add interactive enhancements for feature cards
    document.querySelectorAll('.feature-card').forEach((card, index) => {
        card.addEventListener('mouseenter', () => {
            card.style.transform += ' scale(1.02)';
            card.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transition = 'transform 0.3s ease';
        });
    });
});