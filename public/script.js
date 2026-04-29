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

        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        // Here you can send to API if needed
        // For now, just show success message
        alert(`Спасибо, ${name}! Ваша заявка принята. Мы свяжемся с вами по телефону ${phone} в ближайшее время.`);

        contactForm.reset();
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
        loadProductsFromAPI(),
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
        if (!response.ok) return;

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
        console.error('Error loading services:', error);
    }
}

// Load Masters
async function loadMastersFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/masters`);
        if (!response.ok) return;

        const masters = await response.json();
        if (masters.length > 0) {
            const mastersGrid = document.querySelector('.masters-grid');
            if (mastersGrid) {
                mastersGrid.innerHTML = masters.map(master => {
                    const photoUrl = master.photo_url ? (master.photo_url.startsWith('http') ? master.photo_url : `${API_BASE_URL}${master.photo_url}`) : '';
                    const avatarHtml = photoUrl
                        ? `<img src="${photoUrl}" alt="${master.name}" class="master-img" style="width:100%; height:100%; object-fit:cover; object-position: center top; border-radius:50%; background-color: #fff; filter: brightness(0.95) contrast(0.95);">`
                        : `<div class="master-placeholder">${master.icon || '👨‍💼'}</div>`;

                    return `
                    <div class="master-card" data-master="${master.name}">
                        <div class="master-photo">
                            ${avatarHtml}
                        </div>
                        <h3>${master.name}</h3>
                        <p class="master-specialty">${master.specialty || 'Барбер'}</p>
                        <p class="master-experience">Опыт: ${master.experience || 0} лет</p>
                        <div class="master-rating">⭐⭐⭐⭐⭐</div>
                        <p class="master-description">${master.description || ''}</p>
                    </div>
                `}).join('');
            }
        }
    } catch (error) {
        console.error('Error loading masters:', error);
    }
}

// Load Gallery
async function loadGalleryFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/gallery`);
        if (!response.ok) return;

        const gallery = await response.json();
        if (gallery.length > 0) {
            const galleryGrid = document.querySelector('.gallery-grid');
            if (galleryGrid) {
                galleryGrid.innerHTML = gallery.map((item, index) => {
                    const imageUrl = item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL}${item.image_url}`;
                    return `
                        <div class="gallery-item">
                            <img src="${imageUrl}" alt="Gallery image ${index + 1}">
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
        console.error('Error loading gallery:', error);
    }
}

// Load Reviews
async function loadReviewsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reviews`);
        if (!response.ok) return;

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
        console.error('Error loading reviews:', error);
    }
}

// Load Settings
async function loadSettingsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`);
        if (!response.ok) return;

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

        if (settings.instagram) {
            const instagramLink = document.querySelector('.social-links a:nth-of-type(1)');
            if (instagramLink) instagramLink.href = settings.instagram;
        }

        if (settings.telegram) {
            const telegramLink = document.querySelector('.social-links a:nth-of-type(2)');
            if (telegramLink) telegramLink.href = settings.telegram;
        }

        if (settings.facebook) {
            const facebookLink = document.querySelector('.social-links a:nth-of-type(3)');
            if (facebookLink) facebookLink.href = settings.facebook;
        }
        
        if (settings.payment_card) {
            const cardDisplay = document.getElementById('paymentCardDisplay');
            if (cardDisplay) cardDisplay.textContent = settings.payment_card;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
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

// =========================
// Shop & Cart Logic
// =========================
let cart = JSON.parse(localStorage.getItem('barberCart')) || [];
let productsData = [];
let currentCategory = 'all';
const PRODUCTS_PER_PAGE = 8;
let visibleCount = PRODUCTS_PER_PAGE;

// Load Products
async function loadProductsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (!response.ok) return;

        productsData = await response.json();
        renderShopProducts();
        initShopFilters();
        updateCartUI();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderShopProducts() {
    const shopGrid = document.getElementById('shopGrid');
    const showMoreWrap = document.getElementById('shopShowMore');
    if (!shopGrid) return;

    const filtered = currentCategory === 'all'
        ? productsData
        : productsData.filter(p => p.category === currentCategory);

    const visible = filtered.slice(0, visibleCount);

    if (filtered.length === 0) {
        shopGrid.innerHTML = '<p style="text-align:center;color:#888;padding:2rem;">Товаров в этой категории пока нет.</p>';
        if (showMoreWrap) showMoreWrap.style.display = 'none';
        return;
    }

    shopGrid.innerHTML = visible.map(product => {
        const photoUrl = product.image_url
            ? (product.image_url.startsWith('http') ? product.image_url : `${API_BASE_URL}${product.image_url}`)
            : '';
        const photoHtml = photoUrl
            ? `<img src="${photoUrl}" alt="${product.name}" class="product-image">`
            : `<div class="product-placeholder">🛍️</div>`;

        const isOutOfStock = product.stock <= 0;
        const stockText = isOutOfStock ? 'Нет в наличии' : `В наличии: ${product.stock} шт.`;
        const btnHtml = isOutOfStock
            ? `<button class="btn btn-secondary" disabled>Нет в наличии</button>`
            : `<button class="btn btn-primary" onclick="addToCart(${product.id})">В корзину</button>`;

        return `
            <div class="product-card${isOutOfStock ? ' out-of-stock' : ''}">
                ${photoHtml}
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description || ''}</p>
                    <div class="product-price">${Number(product.price).toLocaleString()} сум</div>
                    <div class="product-stock${isOutOfStock ? ' out-of-stock-text' : ''}">${stockText}</div>
                </div>
                ${btnHtml}
            </div>
        `;
    }).join('');

    if (showMoreWrap) {
        showMoreWrap.style.display = visibleCount < filtered.length ? 'flex' : 'none';
    }
}

function initShopFilters() {
    const filterBtns = document.querySelectorAll('.shop-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            visibleCount = PRODUCTS_PER_PAGE;
            renderShopProducts();
        });
    });

    const showMoreBtn = document.getElementById('showMoreBtn');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            visibleCount += PRODUCTS_PER_PAGE;
            renderShopProducts();
        });
    }
}

// Cart Logic
function saveCart() {
    localStorage.setItem('barberCart', JSON.stringify(cart));
    updateCartUI();
}

function addToCart(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stock <= 0) {
        alert('Извините, этот товар закончился.');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            alert(`Доступно только ${product.stock} шт.`);
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxStock: product.stock
        });
    }
    
    saveCart();
    
    // Animate cart button
    const cartBtn = document.getElementById('cartFloatingBtn');
    if (cartBtn) {
        cartBtn.style.transform = 'scale(1.2)';
        setTimeout(() => cartBtn.style.transform = '', 200);
    }
}

function updateCartQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
    } else if (newQuantity > item.maxStock) {
        alert(`Доступно только ${item.maxStock} шт.`);
        return;
    } else {
        item.quantity = newQuantity;
    }
    
    saveCart();
    renderCartItems();
}

function updateCartUI() {
    const cartCountEl = document.getElementById('cartCount');
    const cartBtn = document.getElementById('cartFloatingBtn');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (cartCountEl) cartCountEl.textContent = totalItems;
    
    if (cartBtn) {
        cartBtn.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// Modals
document.addEventListener('DOMContentLoaded', () => {
    const cartBtn = document.getElementById('cartFloatingBtn');
    const cartModal = document.getElementById('cartModal');
    const cartModalClose = document.getElementById('cartModalClose');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutModalClose = document.getElementById('checkoutModalClose');
    const checkoutForm = document.getElementById('checkoutForm');

    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            renderCartItems();
            cartModal.style.display = 'flex';
        });
    }

    if (cartModalClose) {
        cartModalClose.addEventListener('click', () => {
            cartModal.style.display = 'none';
        });
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) return;
            cartModal.style.display = 'none';
            checkoutModal.style.display = 'flex';
            
            const totalSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            document.getElementById('checkoutTotalShow').textContent = totalSum.toLocaleString();
        });
    }

    if (checkoutModalClose) {
        checkoutModalClose.addEventListener('click', () => {
            checkoutModal.style.display = 'none';
        });
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (cart.length === 0) return alert('Корзина пуста');
            
            const client_name = document.getElementById('checkoutName').value;
            const client_phone = document.getElementById('checkoutPhone').value;
            const address = document.getElementById('checkoutAddress').value;
            const total_amount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            const btn = checkoutForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Отправка...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client_name,
                        client_phone,
                        address,
                        items: cart,
                        total_amount
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('Ваш заказ успешно оформлен! Мы проверяем оплату и скоро свяжемся с вами.');
                    cart = [];
                    saveCart();
                    checkoutModal.style.display = 'none';
                    checkoutForm.reset();
                    // Refresh products to show updated stock
                    loadProductsFromAPI();
                } else {
                    throw new Error(data.error || 'Ошибка при оформлении заказа');
                }
            } catch (error) {
                alert(error.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Я оплатил (Подтвердить заказ)';
            }
        });
    }
});

function renderCartItems() {
    const list = document.getElementById('cartItemsList');
    const sumEl = document.getElementById('cartTotalSum');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!list) return;
    
    if (cart.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-gray);">Корзина пуста</p>';
        if (sumEl) sumEl.textContent = '0';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }
    
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${Number(item.price).toLocaleString()} сум</p>
                </div>
                <div class="cart-item-actions">
                    <button onclick="updateCartQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateCartQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
    if (sumEl) sumEl.textContent = total.toLocaleString();
}
