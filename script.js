// API Base URL
const API_BASE_URL = window.location.origin;

// Mobile Menu Toggle
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}

// Close menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        if (navMenu) navMenu.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
    });
});

// Navbar scroll effect
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100 && navbar) {
        navbar.classList.add('scrolled');
    } else if (navbar) {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// Smooth scrolling for anchor links
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

// Contact Form Handler
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, phone, email, message })
            });

            if (response.ok) {
                alert(`Спасибо, ${name}! Ваша заявка принята. Мы свяжемся с вами в ближайшее время.`);
                contactForm.reset();
            } else {
                throw new Error('Ошибка отправки');
            }
        } catch (error) {
            console.error('Error sending contact form:', error);
            alert('Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже или позвоните нам.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromAPI();
    initializeLightbox();
    initializeAnimations();
});

// Load data from API
async function loadDataFromAPI() {
    await Promise.all([
        loadServicesFromAPI(),
        loadMastersFromAPI(),
        loadGalleryFromAPI(),
        loadReviewsFromAPI(),
        loadSettingsFromAPI()
    ]);
}

// Load Services
async function loadServicesFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/services`);
        if (!response.ok) {
            console.warn('Failed to load services from API, using default content');
            return;
        }

        const services = await response.json();
        if (services.length > 0) {
            const servicesGrid = document.querySelector('.services-grid');
            if (servicesGrid) {
                servicesGrid.innerHTML = services.map(service => `
                    <div class="service-card">
                        <div class="service-icon">${service.icon || '💇'}</div>
                        <h3>${service.name}</h3>
                        <p>${service.description || ''}</p>
                        <div class="service-price">от ${service.price.toLocaleString()} сум</div>
                        <div class="service-duration">${service.duration} минут</div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.warn('Error loading services:', error);
        // Fallback: keep default HTML content
    }
}

// Load Masters
async function loadMastersFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/masters`);
        if (!response.ok) {
            console.warn('Failed to load masters from API, using default content');
            return;
        }

        const masters = await response.json();
        if (masters.length > 0) {
            const mastersGrid = document.querySelector('.masters-grid');
            if (mastersGrid) {
                mastersGrid.innerHTML = masters.map(master => `
                    <div class="master-card" data-master="${master.name}">
                        <div class="master-photo">
                            <div class="master-placeholder">${master.icon || '👨‍💼'}</div>
                        </div>
                        <h3>${master.name}</h3>
                        <p class="master-specialty">${master.specialty || 'Барбер'}</p>
                        <p class="master-experience">Опыт: ${master.experience || 0} лет</p>
                        <div class="master-rating">⭐⭐⭐⭐⭐</div>
                        <p class="master-description">${master.description || ''}</p>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.warn('Error loading masters:', error);
        // Fallback: keep default HTML content
    }
}

// Load Gallery
async function loadGalleryFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/gallery`);
        if (!response.ok) {
            console.warn('Failed to load gallery from API, using default content');
            return;
        }

        const gallery = await response.json();
        if (gallery.length > 0) {
            const galleryGrid = document.querySelector('.gallery-grid');
            if (galleryGrid) {
                galleryGrid.innerHTML = gallery.map((item, index) => {
                    const imageUrl = item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL}${item.image_url}`;
                    return `
                        <div class="gallery-item">
                            <img src="${imageUrl}" alt="Gallery image ${index + 1}" onerror="this.parentElement.innerHTML='<div class=\"gallery-placeholder\"><span>📸</span><p>Фото ${index + 1}</p></div>
                        </div>
                    `;
                }).join('');

                // Re-initialize lightbox for new images
                setTimeout(() => {
                    initializeLightbox();
                }, 100);
            }
        }
    } catch (error) {
        console.warn('Error loading gallery:', error);
        // Fallback: keep default HTML content
    }
}

// Load Reviews
async function loadReviewsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reviews`);
        if (!response.ok) {
            console.warn('Failed to load reviews from API, using default content');
            return;
        }

        const reviews = await response.json();
        if (reviews.length > 0) {
            const reviewsGrid = document.querySelector('.reviews-grid');
            if (reviewsGrid) {
                reviewsGrid.innerHTML = reviews.map(review => `
                    <div class="review-card">
                        <div class="review-header">
                            <div class="review-author">
                                <div class="review-avatar">${review.avatar || review.author.charAt(0)}</div>
                                <div>
                                    <h4>${review.author}</h4>
                                    <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
                                </div>
                            </div>
                            <div class="review-date">${review.date}</div>
                        </div>
                        <p class="review-text">${review.text}</p>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.warn('Error loading reviews:', error);
        // Fallback: keep default HTML content
    }
}

// Load Settings
async function loadSettingsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`);
        if (!response.ok) {
            console.warn('Failed to load settings from API, using default content');
            return;
        }

        const settings = await response.json();

        if (settings.address) {
            const addressEls = document.querySelectorAll('.contact-item');
            if (addressEls[0]) {
                const addressP = addressEls[0].querySelector('p');
                if (addressP) addressP.textContent = settings.address;
            }
        }

        if (settings.phone) {
            const phoneEls = document.querySelectorAll('.contact-item');
            if (phoneEls[1]) {
                const phoneP = phoneEls[1].querySelector('p');
                if (phoneP) phoneP.textContent = settings.phone;
            }
        }

        if (settings.hours) {
            const hoursEls = document.querySelectorAll('.contact-item');
            if (hoursEls[2]) {
                const hoursP = hoursEls[2].querySelector('p');
                if (hoursP) hoursP.textContent = settings.hours;
            }
        }

        // Social links - hide if not set
        const instagramLink = document.querySelector('.social-links a:nth-of-type(1)');
        if (instagramLink) {
            if (settings.instagram && settings.instagram !== '') {
                instagramLink.href = settings.instagram;
                instagramLink.style.display = '';
            } else {
                instagramLink.style.display = 'none';
            }
        }

        const telegramLink = document.querySelector('.social-links a:nth-of-type(2)');
        if (telegramLink) {
            if (settings.telegram && settings.telegram !== '') {
                telegramLink.href = settings.telegram;
                telegramLink.style.display = '';
            } else {
                telegramLink.style.display = 'none';
            }
        }


    } catch (error) {
        console.warn('Error loading settings:', error);
        // Fallback: keep default HTML content
    }
}

// Close lightbox on outside click
document.addEventListener('click', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && e.target === lightbox) {
        closeLightbox();
    }
});

// Lightbox functionality
let currentImageIndex = 0;
let galleryImages = [];

function initializeLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxClose = document.querySelector('.lightbox-close');
    const lightboxPrev = document.querySelector('.lightbox-prev');
    const lightboxNext = document.querySelector('.lightbox-next');

    if (!lightbox || !lightboxImage) return;

    // Collect all gallery images
    galleryImages = [];
    galleryItems.forEach((item) => {
        const img = item.querySelector('img');
        if (img && img.src && !img.src.includes('data:image/svg')) {
            galleryImages.push(img.src);
        }
    });

    // Add click handlers for gallery items
    galleryItems.forEach((item, index) => {
        const img = item.querySelector('img');
        if (img) {
            item.addEventListener('click', () => {
                const imageSrc = img.src;
                currentImageIndex = galleryImages.findIndex(src => src === imageSrc);
                if (currentImageIndex === -1) currentImageIndex = 0;
                openLightbox(currentImageIndex);
            });
        }
    });

    // Close button
    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }

    // Navigation buttons
    if (lightboxPrev) {
        lightboxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            showPreviousImage();
        });
    }

    if (lightboxNext) {
        lightboxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            showNextImage();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('active')) {
            if (e.key === 'ArrowLeft') {
                showPreviousImage();
            } else if (e.key === 'ArrowRight') {
                showNextImage();
            } else if (e.key === 'Escape') {
                closeLightbox();
            }
        }
    });
}

function openLightbox(index) {
    if (galleryImages.length === 0) return;

    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');

    if (index < 0) index = galleryImages.length - 1;
    if (index >= galleryImages.length) index = 0;

    currentImageIndex = index;
    lightboxImage.src = galleryImages[currentImageIndex];
    lightboxImage.alt = `Gallery image ${currentImageIndex + 1}`;
    lightbox.classList.add('active');
}

function showNextImage() {
    if (galleryImages.length === 0) return;
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    const lightboxImage = document.getElementById('lightboxImage');
    if (lightboxImage) {
        lightboxImage.src = galleryImages[currentImageIndex];
        lightboxImage.alt = `Gallery image ${currentImageIndex + 1}`;
    }
}

function showPreviousImage() {
    if (galleryImages.length === 0) return;
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    const lightboxImage = document.getElementById('lightboxImage');
    if (lightboxImage) {
        lightboxImage.src = galleryImages[currentImageIndex];
        lightboxImage.alt = `Gallery image ${currentImageIndex + 1}`;
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
    }
}

// Intersection Observer for animations
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const animateElements = document.querySelectorAll('.service-card, .feature, .gallery-item, .contact-item, .master-card, .review-card');

    animateElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(el);
    });
}

