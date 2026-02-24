// ===============================
// Функция подгрузки HTML
// ===============================
async function loadHTML(selector, url, callback) {
    const element = document.querySelector(selector);
    if (!element) return;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Ошибка загрузки: ${url}`);
        element.innerHTML = await response.text();

        // После вставки HTML вызываем JS
        if (typeof callback === 'function') callback();

    } catch (err) {
        console.error(err);
    }
}

// ===============================
// Инициализация header после подгрузки
// ===============================
function initHeader() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const closeBtn = document.querySelector('.close-menu-btn');
    const menuItems = document.querySelectorAll('.menu-item.has-submenu');

    // Функция закрытия мобильного меню
    function closeMobileMenu() {
        if (mobileNav) mobileNav.classList.remove('active');
        if (menuToggle) {
            menuToggle.classList.remove('is-active');
            menuToggle.setAttribute('aria-expanded', false);
        }
        document.body.classList.remove('no-scroll');
    }

    // Открытие / закрытие меню (бургер)
    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', function () {
            const isOpen = mobileNav.classList.contains('active');
            if (isOpen) {
                closeMobileMenu();
            } else {
                mobileNav.classList.add('active');
                menuToggle.classList.add('is-active');
                menuToggle.setAttribute('aria-expanded', true);
                document.body.classList.add('no-scroll');
            }
        });
    }

    // Кнопка "X" закрывает меню
    if (closeBtn) closeBtn.addEventListener('click', closeMobileMenu);

    // Аккордеон для подменю
    if (menuItems.length > 0) {
        menuItems.forEach(item => {
            const link = item.querySelector('.menu-link');
            const toggleIcon = item.querySelector('.toggle-icon');
            const submenu = item.querySelector('.submenu');

            if (!link || !submenu) return;

            link.addEventListener('click', function (e) {
                e.preventDefault();
                // Закрываем другие подменю
                menuItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                        const otherSubmenu = otherItem.querySelector('.submenu');
                        const otherIcon = otherItem.querySelector('.toggle-icon');
                        if (otherSubmenu) otherSubmenu.style.display = 'none';
                        if (otherIcon) otherIcon.textContent = '+';
                    }
                });

                // Переключаем текущее подменю
                item.classList.toggle('active');
                if (item.classList.contains('active')) {
                    submenu.style.display = 'block';
                    if (toggleIcon) toggleIcon.textContent = '—';
                    link.setAttribute('aria-expanded', 'true');
                } else {
                    submenu.style.display = 'none';
                    if (toggleIcon) toggleIcon.textContent = '+';
                    link.setAttribute('aria-expanded', 'false');
                }
            });

            if (toggleIcon) {
                toggleIcon.addEventListener('click', function (e) {
                    e.preventDefault();
                    link.click();
                });
            }
        });
    }

    // Dropdown кнопки на мобильном
    const dropdowns = document.querySelectorAll('.dropdown-btn');
    if (dropdowns.length > 0) {
        dropdowns.forEach(btn => {
            btn.addEventListener('click', function (e) {
                if (window.innerWidth <= 767) {
                    e.preventDefault();
                    const menu = this.closest('.dropdown')?.querySelector('.dropdown-menu');
                    if (menu) {
                        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                    }
                }
            });
        });
    }
}

// ===============================
// Подгружаем header и footer
// ===============================
loadHTML('#header-placeholder', 'header.html', initHeader);
loadHTML('#footer-placeholder', 'footer.html');

// ===============================
// Scroll для desktop-header
// ===============================
document.addEventListener("scroll", () => {
    const header = document.querySelector(".desktop-header");
    if (!header) return;
    if (window.scrollY > 10) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
});

// ===============================
// IntersectionObserver для карточек
// ===============================
document.addEventListener("DOMContentLoaded", function () {
    const cards = document.querySelectorAll('.product-card');
    if (cards.length === 0) return;

    const options = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, options);

    cards.forEach(card => observer.observe(card));
});







// js/statistics.js











// --- Скрипт для маски телефона ---

document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phone');

    if (phoneInput) {
        phoneInput.addEventListener('input', onPhoneInput);
        phoneInput.addEventListener('keydown', onPhoneKeyDown);
        phoneInput.addEventListener('paste', onPhonePaste);
    }
});

// Форматирует номер телефона
function formatPhoneNumber(value) {
    if (!value) return value;

    const phoneNumber = value.replace(/[^\d]/g, '');
    const prefix = "+996";

    if (phoneNumber.length < 4) {
        return prefix;
    }

    // Начинаем форматирование после кода страны (996)
    let formattedNumber = prefix + " (";

    if (phoneNumber.length > 3) {
        formattedNumber += phoneNumber.substring(3, 6);
    }
    if (phoneNumber.length >= 6) {
        formattedNumber += ") " + phoneNumber.substring(6, 8);
    }
    if (phoneNumber.length >= 8) {
        formattedNumber += "-" + phoneNumber.substring(8, 10);
    }
    if (phoneNumber.length >= 10) {
        formattedNumber += "-" + phoneNumber.substring(10, 12);
    }

    // Ограничиваем общую длину 18 символами "+996 (XXX) XX-XX-XX"
    return formattedNumber.substring(0, 18);
}

// Обработчик ввода
function onPhoneInput(e) {
    const input = e.target;
    const selectionStart = input.selectionStart;
    const oldValue = input.value;

    const formattedValue = formatPhoneNumber(input.value);
    input.value = formattedValue;

    // Восстанавливаем позицию курсора
    if (selectionStart !== null) {
        // Пытаемся угадать новую позицию курсора
        // Это упрощенная логика, которая может быть неидеальной
        if (oldValue.length < formattedValue.length) {
            input.setSelectionRange(selectionStart + 1, selectionStart + 1);
        } else {
            input.setSelectionRange(selectionStart, selectionStart);
        }
    }
}

// Обработчик нажатия клавиш (для Backspace)
function onPhoneKeyDown(e) {
    const input = e.target;
    // Если нажат Backspace и курсор в конце " (", ") " или "-", удаляем весь блок
    if (e.key === 'Backspace' && input.value.length > 5) {
        const pos = input.selectionStart;
        if (input.value[pos - 1] === ' ' || input.value[pos - 1] === ')' || input.value[pos - 1] === '-') {
            // Предотвращаем стандартное поведение
            e.preventDefault();
            // Удаляем 3 символа " (X" или 2 символа ") "
            let charsToRemove = (input.value[pos - 1] === ' ' || input.value[pos - 1] === '-') ? 2 : 3;
            let newValue = input.value.substring(0, pos - charsToRemove);
            input.value = formatPhoneNumber(newValue); // Переформатируем
            input.setSelectionRange(input.value.length, input.value.length);
        } else if (input.value.slice(0, 5) === '+996 (' && pos <= 5) {
            e.preventDefault(); // Не даем удалить "+996 ("
        }
    }
}

// Обработчик вставки из буфера
function onPhonePaste(e) {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const formatted = formatPhoneNumber(pasteData);
    document.execCommand('insertText', false, formatted.replace(e.target.value, ''));
}

























document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll(".service-text h2, .service-text p, .service-img");
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = "translateY(0)";
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    elements.forEach(el => {
        el.style.opacity = 0;
        el.style.transform = "translateY(40px)";
        observer.observe(el);
    });
});







document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".service-card");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
                entry.target.style.animation = "fadeInUp 1s ease forwards";
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    cards.forEach(card => observer.observe(card));
});



// Анимация появления карточек при прокрутке
document.addEventListener('DOMContentLoaded', function () {
    const serviceCards = document.querySelectorAll('.service-card');

    // Создаем наблюдатель для анимации при прокрутке
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Добавляем задержку для каждой карточки
                const index = Array.from(serviceCards).indexOf(entry.target);
                entry.target.style.transitionDelay = `${index * 0.1}s`;
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Наблюдаем за каждой карточкой
    serviceCards.forEach(card => {
        observer.observe(card);
    });

    // Обработчики для кнопок "Подробнее"
    // const cardButtons = document.querySelectorAll('.card-button');
    // cardButtons.forEach(button => {
    //     button.addEventListener('click', function (e) {
    //         e.preventDefault();
    //         const card = this.closest('.service-card');
    //         const serviceName = card.querySelector('h3').textContent;
    //         alert(`Вы выбрали услугу: ${serviceName}. В ближайшее время с вами свяжется наш менеджер!`);
    //     });
    // });
});





// Анимация появления этапов при прокрутке
document.addEventListener('DOMContentLoaded', function () {
    const processSteps = document.querySelectorAll('.process-step');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Добавляем задержку для каждого этапа
                const index = Array.from(processSteps).indexOf(entry.target);
                entry.target.style.transitionDelay = `${index * 0.2}s`;
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    });

    processSteps.forEach(step => {
        observer.observe(step);
    });
});





document.addEventListener("DOMContentLoaded", () => {
    const section = document.querySelector(".work-time");
    if (!section) return; // <— защита от отсутствия элемента

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const title = section.querySelector(".time-title");
                const desc = section.querySelector(".time-desc");
                if (title) title.style.animation = "fadeInDown 1s ease-out forwards";
                if (desc) desc.style.animation = "fadeInUp 1.2s ease-out 0.3s forwards";
                observer.unobserve(section);
            }
        });
    }, { threshold: 0.2 });

    observer.observe(section);
});






document.addEventListener("DOMContentLoaded", () => {
    const priceEl = document.querySelector(".price-value");
    if (!priceEl) return; // 🧩 предотвращает ошибку, если элемента нет

    const target = parseInt(priceEl.dataset.value, 10);
    let current = 0;
    let animated = false;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                const step = target / 60; // скорость счётчика
                const interval = setInterval(() => {
                    current += step;
                    if (current >= target) {
                        current = target;
                        clearInterval(interval);
                    }
                    priceEl.textContent = Math.floor(current).toLocaleString("ru-RU");
                }, 30);
                observer.unobserve(priceEl);
            }
        });
    }, { threshold: 0.5 });

    observer.observe(priceEl);
});






document.addEventListener("DOMContentLoaded", () => {
    const items = document.querySelectorAll(".gallery-item");

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationDelay = `${Math.random() * 0.5}s`;
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.2 }
    );

    items.forEach(item => observer.observe(item));
});





document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 1s ease-out forwards';
            }
        });
    }, observerOptions);

    // Наблюдаем все карточки отзывов
    document.querySelectorAll('.review-card').forEach(card => {
        observer.observe(card);
    });

    // Добавляем плавную прокрутку при клике на карточку
    document.querySelectorAll('.review-card').forEach(card => {
        card.addEventListener('click', function () {
            const stars = this.querySelectorAll('.star');
            stars.forEach((star, index) => {
                star.style.transform = `scale(1.2) rotate(${index * 10}deg)`;
                setTimeout(() => {
                    star.style.transform = 'scale(1.1)';
                }, 300);
            });
        });
    });
});














// ---------- Центрирование активного фильтра ----------
function centerActiveFilter() {
    const container = document.getElementById('filtersContainer');
    if (!container) return;

    const activeFilter = container.querySelector('.filter.active');
    if (!activeFilter || window.innerWidth >= 768) return;

    const containerWidth = container.offsetWidth;
    const filterWidth = activeFilter.offsetWidth;
    const filterLeft = activeFilter.offsetLeft;
    const filterCenter = filterLeft + filterWidth / 2;

    container.scrollLeft = filterCenter - containerWidth / 2;
}

// ---------- Счётчик работ ----------
function updateWorkCount(visible, total) {
    const countElement = document.getElementById('workCount');
    if (!countElement) return;

    countElement.textContent = `Показано ${visible} из ${total} работ`;
}

// ---------- Фильтры ----------
document.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelector('.filter.active')?.classList.remove('active');
        this.classList.add('active');

        centerActiveFilter();

        const type = this.dataset.filter;
        const cards = document.querySelectorAll('.card');
        let visibleCount = 0;

        cards.forEach(card => {
            if (type === 'all' || card.dataset.category === type) {
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });

        updateWorkCount(visibleCount, cards.length);
    });
});

// ---------- Адаптив ----------
function handleResize() {
    const filters = document.querySelector('.filters');
    if (!filters) return;

    filters.style.justifyContent =
        window.innerWidth < 576 ? 'flex-start' : 'center';
}

window.addEventListener('resize', handleResize);
window.addEventListener('load', handleResize);

// ---------- DOMContentLoaded ----------
document.addEventListener('DOMContentLoaded', () => {

    // счётчик
    const cards = document.querySelectorAll('.card');
    if (cards.length) {
        updateWorkCount(cards.length, cards.length);

        cards.forEach((card, i) => {
            card.style.animationDelay = `${i * 0.1}s`;
        });
    }

    centerActiveFilter();
    handleResize();

    // AOS — только если подключён
    if (window.AOS) {
        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: true,
            offset: 100,
            disable: window.innerWidth < 768
        });
    }
});


// ===== ИНИЦИАЛИЗАЦИЯ SWIPER =====
function initSwiper() {
    const swiperContainer = document.querySelector('.reviews-slider');
    if (!swiperContainer) return;

    const swiper = new Swiper('.reviews-slider', {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        speed: 800,
        effect: 'slide',
        grabCursor: true,
        preventInteractionOnTransition: true,

        // Навигация
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },

        // Пагинация
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            dynamicBullets: true,
        },

        // Автоплей
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
        },

        // Адаптивность
        breakpoints: {
            640: {
                slidesPerView: 2,
                spaceBetween: 20,
            },
            1024: {
                slidesPerView: 3,
                spaceBetween: 30,
            },
        },

        // Обработчики событий
        on: {
            init: function () {
                console.log('Swiper инициализирован');
            },
            slideChange: function () {
                // При смене слайда останавливаем все видео
                stopAllVideos();
            },
            touchStart: function () {
                // Останавливаем видео при касании
                stopAllVideos();
            }
        },
    });

    // Сохраняем ссылку на swiper для глобального доступа
    window.reviewsSwiper = swiper;
}

// ===== АНИМАЦИЯ СЧЕТЧИКОВ =====
function initCounters() {
    function animateCounter(counter) {
        if (!counter) return;

        const target = parseInt(counter.getAttribute('data-count') || counter.textContent.replace(/\D/g, ''));
        const duration = 2000; // 2 секунды
        const startTime = Date.now();
        const startValue = 0;

        function update() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Используем ease-out функцию для более естественной анимации
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (target - startValue) * easeProgress);

            counter.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                counter.textContent = target.toLocaleString();
            }
        }

        update();
    }

    // Запуск анимации счетчиков при скролле
    function checkCounters() {
        const statsSection = document.querySelector('.reviews-stats');
        if (!statsSection) return;

        function isElementInViewport(el) {
            const rect = el.getBoundingClientRect();
            return (
                rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
                rect.bottom >= 0
            );
        }

        if (isElementInViewport(statsSection)) {
            const counters = document.querySelectorAll('.stat-number');
            counters.forEach(counter => {
                // Проверяем, не был ли уже анимирован этот счетчик
                if (!counter.classList.contains('animated')) {
                    animateCounter(counter);
                    counter.classList.add('animated');
                }
            });
        }
    }

    // Используем Intersection Observer для лучшей производительности
    const statsSection = document.querySelector('.reviews-stats');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counters = document.querySelectorAll('.stat-number');
                    counters.forEach(counter => {
                        if (!counter.classList.contains('animated')) {
                            animateCounter(counter);
                            counter.classList.add('animated');
                        }
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '50px'
        });

        observer.observe(statsSection);
    }

    // Также добавляем обработчик скролла для обратной совместимости
    window.addEventListener('scroll', checkCounters);
    // Проверяем сразу при загрузке
    setTimeout(checkCounters, 100);
}

// ===== ИНИЦИАЛИЗАЦИЯ ШАГОВ ПРОЦЕССА =====
function initProcessSteps() {
    const processSteps = document.querySelectorAll('.process-step');
    if (!processSteps.length) return;

    processSteps.forEach((step, index) => {
        // Устанавливаем начальные стили
        step.style.opacity = '0';
        step.style.transform = 'translateY(20px)';
        step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        // Плавное появление шагов
        setTimeout(() => {
            step.style.opacity = '1';
            step.style.transform = 'translateY(0)';
        }, index * 150);

        // Добавляем обработчики событий
        step.addEventListener('mouseenter', () => {
            step.style.zIndex = '10';
        });

        step.addEventListener('mouseleave', () => {
            step.style.zIndex = '';
        });
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ ВИДЕО-ОТЗЫВОВ =====
function initVideoReviews() {
    // Обработчик для встроенных видео в карточках
    document.querySelectorAll('.review-media.video-review').forEach(wrapper => {
        const video = wrapper.querySelector('video');
        if (!video) return;

        wrapper.addEventListener('click', (e) => {
            e.preventDefault();

            // Останавливаем все другие видео
            stopAllVideosExcept(video);

            if (video.paused) {
                // Начинаем воспроизведение
                video.muted = true; // Начинаем с выключенным звуком для автоплей
                video.play()
                    .then(() => {
                        video.muted = false;
                        wrapper.classList.add('playing');
                    })
                    .catch(err => {
                        console.warn('Autoplay blocked:', err);
                        // Показываем уведомление пользователю
                        showPlayNotification(wrapper);
                    });
            } else {
                // Останавливаем текущее видео
                video.pause();
                video.currentTime = 0;
                wrapper.classList.remove('playing');
            }
        });

        // Останавливаем видео при окончании воспроизведения
        video.addEventListener('ended', () => {
            video.currentTime = 0;
            wrapper.classList.remove('playing');
        });
    });

    // Обработчик для основного (фичерного) видео
    const mainVideoPlaceholder = document.querySelector('.video-placeholder');
    const mainVideo = document.querySelector('.featured-video');

    if (mainVideoPlaceholder && mainVideo) {
        const source = mainVideo.querySelector('source');

        mainVideoPlaceholder.addEventListener('click', () => {
            const videoSrc = mainVideoPlaceholder.dataset.video;
            if (!videoSrc || !source) return;

            // Останавливаем все другие видео
            stopAllVideos();

            // Подставляем и загружаем видео
            source.src = videoSrc;
            mainVideo.load();

            // Показываем плеер, скрываем плейсхолдер
            mainVideoPlaceholder.style.display = 'none';
            mainVideo.style.display = 'block';

            // Запускаем воспроизведение
            mainVideo.muted = true;
            mainVideo.play()
                .then(() => {
                    mainVideo.muted = false;
                    mainVideoPlaceholder.classList.add('playing');
                })
                .catch(err => {
                    console.warn('Main video autoplay blocked:', err);
                    // Показываем кнопку для ручного запуска
                    showVideoPlayButton(mainVideo);
                });
        });

        // Обработчик окончания видео
        mainVideo.addEventListener('ended', () => {
            mainVideo.style.display = 'none';
            mainVideoPlaceholder.style.display = 'flex';
            mainVideoPlaceholder.classList.remove('playing');
        });
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ МОДАЛЬНОГО ОКНА ДЛЯ ВИДЕО =====
function initVideoModal() {
    const modal = document.getElementById('videoModal');
    if (!modal) return;

    const modalVideo = modal.querySelector('#modalVideo');
    const source = modalVideo?.querySelector('source');
    const closeBtn = modal.querySelector('.video-modal__close');
    const overlay = modal.querySelector('.video-modal__overlay');

    if (!modalVideo || !source || !closeBtn || !overlay) return;

    // Закрываем модальное окно
    function closeModal() {
        modal.classList.remove('open');
        modalVideo.pause();
        modalVideo.currentTime = 0;
        source.src = '';

        // Восстанавливаем скролл страницы
        document.body.style.overflow = '';
    }

    // Открываем модальное окно с видео
    function openModal(videoSrc, videoId) {
        if (!videoSrc) return;

        // Останавливаем все видео на странице
        stopAllVideos();

        // Устанавливаем источник видео
        source.src = videoSrc;
        modalVideo.load();

        // Открываем модальное окно
        modal.classList.add('open');

        // Блокируем скролл страницы
        document.body.style.overflow = 'hidden';

        // Пытаемся запустить воспроизведение
        modalVideo.muted = true;
        modalVideo.play()
            .then(() => {
                modalVideo.muted = false;
            })
            .catch(err => {
                console.warn('Modal video autoplay blocked:', err);
            });
    }

    // Обработчики закрытия
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });

    // Инициализация кликов на видео-карточки
    const videoCards = document.querySelectorAll('[data-video-modal]');
    videoCards.forEach(card => {
        card.addEventListener('click', () => {
            const videoSrc = card.dataset.videoSrc;
            const videoId = card.dataset.videoId;
            if (videoSrc) {
                openModal(videoSrc, videoId);
            }
        });
    });

    // Сохраняем функции для глобального доступа
    window.openVideoModal = openModal;
    window.closeVideoModal = closeModal;
}

// ===== ИНИЦИАЛИЗАЦИЯ КАРТОЧЕК УТП =====
function initUspCards() {
    const uspCards = document.querySelectorAll('.usp-card');
    if (!uspCards.length) return;

    // Параллакс эффект только на десктопе
    if (window.innerWidth >= 768) {
        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;

            uspCards.forEach((card, index) => {
                const speed = 0.03;
                const x = (mouseX - 0.5) * 20 * speed;
                const y = (mouseY - 0.5) * 20 * speed;

                card.style.transform = `translateY(-10px) translate3d(${x}px, ${y}px, 0)`;
            });
        });
    }

    // Эффект при наведении
    uspCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transition = '';
        });
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ CTA КНОПКИ =====
function initCtaButton() {
    const ctaButton = document.querySelector('.cta-button');
    if (!ctaButton) return;

    ctaButton.addEventListener('click', function (e) {
        e.preventDefault();

        // Анимация нажатия
        this.classList.add('clicked');
        setTimeout(() => {
            this.classList.remove('clicked');
        }, 300);

        // В реальном проекте здесь будет открытие формы
        console.log('CTA button clicked - opening booking form');

        // Пример: открытие модального окна с формой
        // openBookingModal();

        // Или скролл к форме
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
            bookingForm.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ АДАПТИВНЫХ ОБРАБОТЧИКОВ =====
function initResponsiveHandlers() {
    // Обработчик изменения размера окна
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            handleResize();
        }, 250);
    });

    function handleResize() {
        // Отключаем параллакс на мобильных
        const uspCards = document.querySelectorAll('.usp-card');
        if (window.innerWidth < 768) {
            uspCards.forEach(card => {
                card.style.transform = '';
            });
        }

        // Обновляем AOS для мобильных
        if (window.innerWidth < 768) {
            AOS.refreshHard();
        }
    }

    // Инициализация сразу
    handleResize();
}

// ===== АНИМАЦИЯ ЗАГОЛОВКОВ =====
function initTitleAnimations() {
    const titles = document.querySelectorAll('.section-title');
    if (!titles.length) return;

    // Добавляем стиль для анимации букв
    if (!document.querySelector('#title-animation-style')) {
        const style = document.createElement('style');
        style.id = 'title-animation-style';
        style.textContent = `
            @keyframes fadeInLetter {
                from { 
                    opacity: 0; 
                    transform: translateY(10px) rotateX(90deg); 
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0) rotateX(0); 
                }
            }
            
            .letter-animated {
                display: inline-block;
                opacity: 0;
                animation: fadeInLetter 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
        `;
        document.head.appendChild(style);
    }

    // Анимируем заголовки
    titles.forEach(title => {
        if (title.classList.contains('animated')) return;

        const text = title.textContent;
        title.innerHTML = '';

        for (let i = 0; i < text.length; i++) {
            const span = document.createElement('span');
            span.textContent = text[i];
            span.classList.add('letter-animated');
            span.style.animationDelay = `${i * 0.05}s`;
            span.style.display = text[i] === ' ' ? 'inline' : 'inline-block';
            title.appendChild(span);
        }

        title.classList.add('animated');
    });
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function stopAllVideos() {
    document.querySelectorAll('video').forEach(video => {
        if (!video.paused) {
            video.pause();
            video.currentTime = 0;
        }
        video.parentElement?.classList.remove('playing');
    });
}

function stopAllVideosExcept(exceptVideo) {
    document.querySelectorAll('video').forEach(video => {
        if (video !== exceptVideo && !video.paused) {
            video.pause();
            video.currentTime = 0;
            video.parentElement?.classList.remove('playing');
        }
    });
}

function showPlayNotification(wrapper) {
    // Создаем уведомление о необходимости кликнуть для воспроизведения
    const notification = document.createElement('div');
    notification.className = 'video-play-notification';
    notification.innerHTML = `
        <p>Кликните для воспроизведения видео</p>
        <button class="play-btn">▶️ Воспроизвести</button>
    `;

    notification.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 100;
    `;

    wrapper.appendChild(notification);

    // Обработчик клика на кнопку воспроизведения
    notification.querySelector('.play-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const video = wrapper.querySelector('video');
        if (video) {
            video.play();
            wrapper.classList.add('playing');
            notification.remove();
        }
    });

    // Удаляем уведомление через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function showVideoPlayButton(videoElement) {
    // Создаем кнопку воспроизведения поверх видео
    const playBtn = document.createElement('button');
    playBtn.className = 'manual-play-btn';
    playBtn.innerHTML = '▶';
    playBtn.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.9);
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    videoElement.parentElement.style.position = 'relative';
    videoElement.parentElement.appendChild(playBtn);

    playBtn.addEventListener('click', () => {
        videoElement.play();
        playBtn.style.display = 'none';
    });
}

// ===== ОБРАБОТЧИКИ ДОСТУПНОСТИ =====
document.addEventListener('keydown', function (e) {
    // Навигация по Tab
    if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        focusableElements.forEach(el => {
            el.addEventListener('focus', function () {
                this.style.outline = '2px solid var(--primary)';
                this.style.outlineOffset = '2px';
            });

            el.addEventListener('blur', function () {
                this.style.outline = 'none';
            });
        });
    }

    // Управление видео с клавиатуры
    if (e.key === ' ' || e.key === 'Spacebar') {
        const focusedVideo = document.activeElement.closest('.video-review')?.querySelector('video');
        if (focusedVideo) {
            e.preventDefault();
            if (focusedVideo.paused) {
                focusedVideo.play();
            } else {
                focusedVideo.pause();
            }
        }
    }
});

// ===== ПЛАВНЫЙ СКРОЛЛ ДЛЯ ЯКОРЕЙ =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || targetId === '#!') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();

            // Рассчитываем отступ для фиксированного header'а
            const headerHeight = document.querySelector('header')?.offsetHeight || 80;

            window.scrollTo({
                top: targetElement.offsetTop - headerHeight,
                behavior: 'smooth'
            });

            // Фокус для доступности
            targetElement.setAttribute('tabindex', '-1');
            targetElement.focus();
        }
    });
});

// ===== ОБРАБОТЧИК ПОЛНОЙ ЗАГРУЗКИ СТРАНИЦЫ =====
window.addEventListener('load', function () {
    document.body.classList.add('loaded');

    // Скрываем прелоадер если он есть
    const loader = document.querySelector('.page-loader');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }, 300);
    }

    // Запускаем анимации после загрузки
    setTimeout(() => {
        initTitleAnimations();
    }, 100);
});

// ===== ОБРАБОТЧИКИ ДЛЯ SWIPER СЛАЙДОВ С ВИДЕО =====
// Обработчик для паузы видео при выходе из слайда
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.video-review video').forEach(video => {
        video.addEventListener('play', function () {
            // Останавливаем другие видео при запуске текущего
            stopAllVideosExcept(this);
        });
    });
});

// Экспортируем функции для глобального доступа
window.APP = {
    stopAllVideos,
    openVideoModal: window.openVideoModal,
    closeVideoModal: window.closeVideoModal
};




// Инициализация Swiper
document.addEventListener('DOMContentLoaded', function () {
    // Инициализация слайдера
    const swiper = new Swiper('.reviews-slider', {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        breakpoints: {
            640: {
                slidesPerView: 1,
            },
            768: {
                slidesPerView: 2,
            },
            1024: {
                slidesPerView: 3,
            },
        },
    });

    // Анимация статистики
    function animateStats() {
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(stat => {
            const target = parseFloat(stat.getAttribute('data-count'));
            const suffix = stat.textContent.includes('%') ? '%' : '';
            let current = 0;
            const increment = target / 50;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                stat.textContent = suffix === '%' ?
                    current.toFixed(0) + suffix :
                    current.toFixed(1);
            }, 30);
        });
    }

    // Запуск анимации при появлении в viewport
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.reviews-stats');
    if (statsSection) {
        observer.observe(statsSection);
    }

    // Воспроизведение видео в слайдере
    window.playVideo = function (element) {
        const videoContainer = element.closest('.video-review');
        const thumbnailVideo = element.querySelector('video');
        const playButton = element.querySelector('.play-button');
        const videoOverlay = element.querySelector('.video-overlay');

        if (thumbnailVideo.paused) {
            thumbnailVideo.play();
            thumbnailVideo.controls = true;
            videoContainer.classList.add('playing');
            playButton.style.opacity = '0';
            if (videoOverlay) videoOverlay.style.opacity = '0';
        } else {
            thumbnailVideo.pause();
            thumbnailVideo.controls = false;
            videoContainer.classList.remove('playing');
            playButton.style.opacity = '1';
            if (videoOverlay) videoOverlay.style.opacity = '1';
        }
    };

    // Воспроизведение главного видео
    window.playFeaturedVideo = function (element) {
        const wrapper = element.closest('.featured-video-wrapper');
        const placeholder = wrapper.querySelector('.video-placeholder');
        const video = wrapper.querySelector('.featured-video');

        placeholder.style.opacity = '0';
        placeholder.style.pointerEvents = 'none';
        video.style.display = 'block';
        video.play();
    };

    // Пауза видео при смене слайда
    swiper.on('slideChange', function () {
        document.querySelectorAll('.video-review video').forEach(video => {
            video.pause();
            video.controls = false;
            const container = video.closest('.video-review');
            if (container) {
                container.classList.remove('playing');
                const playButton = container.querySelector('.play-button');
                const videoOverlay = container.querySelector('.video-overlay');
                if (playButton) playButton.style.opacity = '1';
                if (videoOverlay) videoOverlay.style.opacity = '1';
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // ===============================
    // КАРТОЧКИ И ФИЛЬТРЫ
    // ===============================
    const cards = Array.from(document.querySelectorAll('.card'));
    const filters = document.querySelectorAll('.filter');
    const counter = document.getElementById('workCount');

    // Отображаем счётчик только если есть карточки и элемент счётчика
    if (cards.length && counter) {
        const totalCount = cards.length;

        // ===============================
        // Функция обновления счётчика
        // ===============================
        function updateCounter(visibleCards) {
            counter.textContent = `Показано ${visibleCards} из ${totalCount} работ`;
        }

        // начальное значение
        updateCounter(totalCount);

        // ===============================
        // Фильтрация карточек
        // ===============================
        if (filters.length) {
            filters.forEach(button => {
                button.addEventListener('click', () => {
                    const filter = button.dataset.filter;

                    filters.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    let visible = 0;

                    cards.forEach(card => {
                        const category = card.dataset.category;

                        if (filter === 'all' || category === filter) {
                            card.style.display = 'block';
                            visible++;
                        } else {
                            card.style.display = 'none';
                        }
                    });

                    updateCounter(visible);
                });
            });
        }
    }

    // ===============================
    // BEFORE / AFTER SLIDER
    // ===============================
    document.querySelectorAll('.before-after').forEach(slider => {
        const range = slider.querySelector('input[type="range"]');
        const before = slider.querySelector('.before');
        const divider = slider.querySelector('.divider');

        if (!range || !before || !divider) return; // безопасно пропускаем

        const updateSlider = value => {
            before.style.width = `${100 - value}%`;
            divider.style.left = `${value}%`;
        };

        updateSlider(range.value);

        range.addEventListener('input', e => {
            updateSlider(e.target.value);
        });
    });
});









class CounterAnimation {
    constructor() {
        this.counters = document.querySelectorAll('.stat-number');
        this.observer = null;
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.counters.forEach(counter => {
            counter.innerHTML = '0';
        });
    }

    setupIntersectionObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '0px 0px -50px 0px'
        });

        this.counters.forEach(counter => {
            this.observer.observe(counter);
        });
    }

    animateCounter(element) {
        const target = parseInt(element.getAttribute('data-target'));
        const suffix = element.getAttribute('data-suffix') || '';
        const duration = 2000;
        const startTime = performance.now();
        const startValue = 0;

        const easeOutQuart = (t) => 1 - --t * t * t * t;

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);
            const currentValue = Math.floor(easedProgress * target);

            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target;
                element.classList.add('is-counted');
                if (suffix) {
                    element.setAttribute('data-suffix', suffix);
                }
            }
        };

        requestAnimationFrame(updateCounter);
    }
}







  document.addEventListener('DOMContentLoaded', async () => {
            const form = document.getElementById('guestform-form');
            const serviceSelect = document.getElementById('guestform-service');
            const typeSelect = document.getElementById('guestform-service-type');
            const priceDisplay = document.getElementById('guestform-price-display');
            const priceEl = document.getElementById('guestform-price');
            const dateInput = document.getElementById('guestform-date');
            const submitBtn = document.getElementById('guestform-submit');
            const messageContainer = document.getElementById('guestform-message');
            const successPopup = document.getElementById('guestform-success');
            const phoneInput = document.getElementById('guestform-phone');

            let currentServices = [];
            let currentServiceTypes = [];

            // Установка минимальной даты (сегодня)
            const today = new Date();
            today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
            dateInput.min = today.toISOString().slice(0, 16);

            // ================== Маска телефона ==================
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 0) {
                    if (value.startsWith('996')) {
                        value = value.slice(3);
                    }
                    // Форматирование: +996 (XXX) XXX-XXX
                    let formatted = '+996 ';
                    if (value.length > 0) {
                        formatted += '(' + value.slice(0, 3);
                        if (value.length >= 4) {
                            formatted += ') ' + value.slice(3, 6);
                        }
                        if (value.length >= 7) {
                            formatted += '-' + value.slice(6, 9);
                        }
                    }
                    e.target.value = formatted;
                }
            });

            // ================== Функция показа сообщений ==================
            function showMessage(text, isSuccess = true) {
                messageContainer.innerHTML = `
                    <div class="guestform-message ${isSuccess ? 'success' : 'error'}">
                        <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                        ${text}
                    </div>
                `;
                
                setTimeout(() => {
                    messageContainer.innerHTML = '';
                }, 5000);
            }

            // ================== Загрузка услуг ==================
            async function loadServices() {
                try {
                    // Проверяем, доступен ли supabaseClient
                    if (typeof supabaseClient === 'undefined') {
                        throw new Error('Supabase client не инициализирован');
                    }

                    const { data: services, error } = await supabaseClient
                        .from('services')
                        .select('*')
                        .order('name');

                    if (error) throw error;
                    
                    currentServices = services;
                    
                    serviceSelect.innerHTML = '<option value="" disabled selected>Выберите услугу</option>';
                    
                    services.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.id;
                        opt.textContent = `${s.name} (${s.base_price} сом)`;
                        serviceSelect.appendChild(opt);
                    });
                } catch (err) {
                    console.error('Ошибка загрузки услуг:', err);
                    showMessage('Ошибка загрузки услуг. Пожалуйста, обновите страницу.', false);
                    
                    // Добавляем тестовые данные для демонстрации
                    serviceSelect.innerHTML = '<option value="" disabled selected>Выберите услугу</option>';
                    const testServices = [
                        { id: 1, name: 'Полная оклейка', base_price: 50000 },
                        { id: 2, name: 'Частичная оклейка', base_price: 25000 },
                        { id: 3, name: 'Защитная пленка', base_price: 35000 }
                    ];
                    
                    testServices.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.id;
                        opt.textContent = `${s.name} (${s.base_price} сом)`;
                        serviceSelect.appendChild(opt);
                    });
                    
                    currentServices = testServices;
                }
            }

            // ================== Загрузка вариантов услуги ==================
            serviceSelect.addEventListener('change', async () => {
                const serviceId = serviceSelect.value;
                if (!serviceId) return;

                typeSelect.innerHTML = '<option value="">Загрузка...</option>';
                typeSelect.disabled = true;

                try {
                    if (typeof supabaseClient === 'undefined') {
                        throw new Error('Supabase client не инициализирован');
                    }

                    const { data: types, error } = await supabaseClient
                        .from('service_types')
                        .select('*')
                        .eq('service_id', serviceId)
                        .order('name');

                    if (error) throw error;
                    
                    currentServiceTypes = types;
                    
                    typeSelect.innerHTML = '<option value="">Без варианта</option>';
                    
                    types.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t.id;
                        opt.textContent = `${t.name}${t.additional_price > 0 ? ` (+${t.additional_price} сом)` : ''}`;
                        typeSelect.appendChild(opt);
                    });
                    
                    typeSelect.disabled = false;
                    updatePrice();
                } catch (err) {
                    console.error('Ошибка загрузки вариантов:', err);
                    
                    // Добавляем тестовые данные для демонстрации
                    const testTypes = [
                        { id: 101, name: 'Стандарт', additional_price: 0 },
                        { id: 102, name: 'Премиум', additional_price: 10000 },
                        { id: 103, name: 'Спорт', additional_price: 15000 }
                    ];
                    
                    currentServiceTypes = testTypes;
                    
                    typeSelect.innerHTML = '<option value="">Без варианта</option>';
                    testTypes.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t.id;
                        opt.textContent = `${t.name}${t.additional_price > 0 ? ` (+${t.additional_price} сом)` : ''}`;
                        typeSelect.appendChild(opt);
                    });
                    
                    typeSelect.disabled = false;
                    updatePrice();
                }
            });

            typeSelect.addEventListener('change', updatePrice);

            // ================== Подсчет цены ==================
            function updatePrice() {
                const service = currentServices.find(s => s.id == serviceSelect.value);
                const type = currentServiceTypes.find(t => t.id == typeSelect.value);
                
                if (!service) {
                    priceDisplay.style.display = 'none';
                    return;
                }
                
                const total = (service.base_price || 0) + (type?.additional_price || 0);
                priceEl.textContent = total.toLocaleString();
                priceDisplay.style.display = 'block';
            }

            // ================== Отправка формы ==================
            submitBtn.addEventListener('click', async () => {
                const clientName = document.getElementById('guestform-name').value.trim();
                const clientPhone = document.getElementById('guestform-phone').value.trim();
                const serviceId = serviceSelect.value;
                const serviceTypeId = typeSelect.value || null;
                const notes = document.getElementById('guestform-note').value.trim();
                const scheduledAt = dateInput.value;

                // Валидация
                if (!clientName || !clientPhone || !serviceId || !scheduledAt) {
                    form.classList.add('error-shake');
                    setTimeout(() => form.classList.remove('error-shake'), 600);
                    showMessage('Заполните все обязательные поля', false);
                    return;
                }

                // Валидация телефона
                const phoneDigits = clientPhone.replace(/\D/g, '');
                if (phoneDigits.length < 12) { // 996 + 9 цифр
                    showMessage('Введите корректный номер телефона', false);
                    return;
                }

                // Валидация даты
                const selectedDate = new Date(scheduledAt);
                if (selectedDate < new Date()) {
                    showMessage('Дата не может быть в прошлом', false);
                    return;
                }

                const totalPrice = parseInt(priceEl.textContent.replace(/\D/g, '')) || 0;

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

                try {
                    // Проверяем наличие supabaseClient
                    if (typeof supabaseClient === 'undefined') {
                        // Имитация успешной отправки для демонстрации
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        throw new Error('demo');
                    }

                    const { data, error } = await supabaseClient
                        .from('appointments')
                        .insert([{
                            user_id: null,
                            car_id: null,
                            service_id: serviceId,
                            service_type_id: serviceTypeId,
                            scheduled_at: new Date(scheduledAt).toISOString(),
                            notes: notes || null,
                            status: 'pending',
                            total_price: totalPrice,
                            client_name: clientName,
                            client_phone: clientPhone
                        }]);

                    if (error) throw error;
                    
                    // Успешная отправка
                    showSuccessPopup();
                    showMessage('Запись успешно создана! Мы свяжемся с вами в ближайшее время.');
                    
                    // Сброс формы
                    form.reset();
                    priceDisplay.style.display = 'none';
                    typeSelect.innerHTML = '<option value="">Выберите вариант</option>';
                    
                } catch (err) {
                    if (err.message === 'demo') {
                        // Демо-режим - показываем успех
                        showSuccessPopup();
                        showMessage('Запись успешно создана! (Демо-режим)');
                        
                        form.reset();
                        priceDisplay.style.display = 'none';
                        typeSelect.innerHTML = '<option value="">Выберите вариант</option>';
                    } else {
                        console.error('Ошибка:', err);
                        showMessage('Ошибка при создании записи: ' + err.message, false);
                    }
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Подтвердить запись';
                }
            });

            // ================== Показ popup ==================
            function showSuccessPopup() {
                successPopup.classList.add('active');
                
                setTimeout(() => {
                    successPopup.classList.remove('active');
                }, 4000);
            }

            // Закрытие popup по клику вне карточки
            successPopup.addEventListener('click', (e) => {
                if (e.target === successPopup) {
                    successPopup.classList.remove('active');
                }
            });

            // ================== Инициализация ==================
            await loadServices();
            
            // Устанавливаем текущую дату и время с округлением до часа
            const now = new Date();
            now.setHours(now.getHours() + 1, 0, 0, 0);
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = '00';
            dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        });