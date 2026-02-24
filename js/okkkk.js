// ===================================================== 
// NAVIGATION SCROLL EFFECT
// =====================================================
console.log('Mobile menu button:', document.getElementById('mobileMenuBtn'));
console.log('Nav links:', document.querySelector('.nav-links'));
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// =====================================================
// BEFORE/AFTER SLIDERS
// =====================================================

function initSliders() {
    const sliders = document.querySelectorAll('.before-after-slider');
    
    sliders.forEach(slider => {
        const sliderInput = slider.querySelector('.slider-input');
        const afterContainer = slider.querySelector('.after-container');
        const sliderLine = slider.querySelector('.slider-line');
        const sliderHandle = slider.querySelector('.slider-handle');
        
        if (!sliderInput || !afterContainer) return;
        
        function updateSlider(value) {
            const clipValue = 100 - value;
            afterContainer.style.clipPath = `inset(0 ${clipValue}% 0 0)`;
            if (sliderLine) sliderLine.style.left = `${value}%`;
            if (sliderHandle) sliderHandle.style.left = `${value}%`;
        }
        
        // Mouse events
        sliderInput.addEventListener('input', (e) => {
            updateSlider(e.target.value);
        });
        
        // Touch support
        let isDragging = false;
        
        sliderInput.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            const rect = sliderInput.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            sliderInput.value = percentage;
            updateSlider(percentage);
        });
        
        sliderInput.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = sliderInput.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            sliderInput.value = percentage;
            updateSlider(percentage);
        });
        
        sliderInput.addEventListener('touchend', () => {
            isDragging = false;
        });
    });
}

// =====================================================
// FAQ ACCORDION
// =====================================================

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all items
            faqItems.forEach(i => i.classList.remove('active'));
            
            // Toggle current item
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// =====================================================
// FORM VALIDATION
// =====================================================

function initForm() {
    const form = document.getElementById('bookingForm');
    
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Validate name
        if (!data.name || data.name.trim().length < 2) {
            showNotification('Пожалуйста, введите корректное имя', 'error');
            return;
        }
        
        // Validate phone
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (!data.phone || !phoneRegex.test(data.phone.replace(/\s/g, ''))) {
            showNotification('Пожалуйста, введите корректный номер телефона', 'error');
            return;
        }
        
        // Success
        showNotification('Заявка отправлена! Мы свяжемся с вами в течение 10 минут.', 'success');
        form.reset();
    });
}

// =====================================================
// NOTIFICATION SYSTEM
// =====================================================

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '24px',
        right: '24px',
        padding: '20px 32px',
        background: type === 'success' ? 'linear-gradient(135deg, #10b981, #3b82f6)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: 'white',
        borderRadius: '16px',
        fontWeight: '700',
        fontSize: '14px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        zIndex: '9999',
        animation: 'slideInRight 0.3s ease',
        maxWidth: '400px'
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// =====================================================
// SCROLL ANIMATIONS
// =====================================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    const elements = document.querySelectorAll('.service-card, .review-card, .process-step');
    
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(el);
    });
}

// =====================================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// =====================================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// =====================================================
// MOBILE MENU (ИСПРАВЛЕННЫЙ!)
// =====================================================

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;
    
    if (!mobileMenuBtn || !navLinks) return;
    
    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navLinks.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
        body.classList.toggle('menu-open');
    });
    
    // Закрытие меню при клике на ссылку
    navLinks.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            navLinks.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
            body.classList.remove('menu-open');
        }
    });
    
    // Закрытие меню при клике вне его
    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            navLinks.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
            body.classList.remove('menu-open');
        }
    });
    
    // Закрытие меню при нажатии ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            navLinks.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
            body.classList.remove('menu-open');
        }
    });
}

// =====================================================
// INITIALIZE ALL
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initSliders();
    initFAQ();
    initForm();
    initScrollAnimations();
    initSmoothScroll();
    initMobileMenu(); // Теперь эта функция будет работать!
});

// =====================================================
// PERFORMANCE OPTIMIZATION
// =====================================================

// Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Optimize scroll performance
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            // Scroll-based animations go here
            ticking = false;
        });
        ticking = true;
    }
});