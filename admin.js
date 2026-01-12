// API Base URL
const API_BASE_URL = window.location.origin;

// Token management
let authToken = localStorage.getItem('adminToken') || '';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken && !endpoint.includes('/auth/login')) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401 || response.status === 403) {
            // Token expired or invalid
            localStorage.removeItem('adminToken');
            authToken = '';
            showLoginScreen();
            throw new Error('Session expired. Please login again.');
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeLogin();
    initializeNavigation();
    initializeSections();
    initializeModals();
    loadData();
});

// Authentication
function checkAuth() {
    if (authToken) {
        showAdminPanel();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
}

async function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const data = await apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            showAdminPanel();
            loadData();
        } catch (error) {
            alert('Неверный логин или пароль: ' + error.message);
        }
    });
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        authToken = '';
        showLoginScreen();
    });
}

// Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            
            navItems.forEach(ni => ni.classList.remove('active'));
            item.classList.add('active');
            
            showSection(section);
        });
    });
}

function showSection(sectionName) {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(`${sectionName}-section`).classList.add('active');
}

// Services Management
function initializeSections() {
    initializeServices();
    initializeGallery();
    initializeMasters();
    initializeReviews();
    initializeSettings();
}

function initializeServices() {
    document.getElementById('addServiceBtn').addEventListener('click', () => {
        openServiceModal();
    });
    
    document.getElementById('serviceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveService();
    });
}

async function loadServices() {
    try {
        const services = await apiCall('/services');
        renderServices(services);
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('servicesList').innerHTML = '<p style="color: var(--danger);">Ошибка загрузки услуг</p>';
    }
}

function renderServices(services) {
    const container = document.getElementById('servicesList');
    if (services.length === 0) {
        container.innerHTML = '<p style="color: var(--text-gray);">Услуг пока нет. Добавьте первую услугу.</p>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div class="service-item-admin">
            <div class="service-icon-admin">${service.icon || '✂️'}</div>
            <div class="service-info-admin">
                <h3>${service.name}</h3>
                <p>${service.description}</p>
                <div class="service-price-admin">${service.price.toLocaleString()} сум • ${service.duration} мин</div>
            </div>
            <div class="service-actions">
                <button class="btn btn-primary btn-sm" onclick="editService(${service.id})">✏️ Редактировать</button>
                <button class="btn btn-danger btn-sm" onclick="deleteService(${service.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

async function openServiceModal(serviceId = null) {
    const modal = document.getElementById('serviceModal');
    
    if (serviceId) {
        try {
            const services = await apiCall('/services');
            const service = services.find(s => s.id === serviceId);
            if (service) {
                document.getElementById('serviceModalTitle').textContent = 'Редактировать услугу';
                document.getElementById('serviceId').value = service.id;
                document.getElementById('serviceName').value = service.name;
                document.getElementById('serviceDescription').value = service.description || '';
                document.getElementById('servicePrice').value = service.price;
                document.getElementById('serviceDuration').value = service.duration;
                document.getElementById('serviceIcon').value = service.icon || '💇';
            }
        } catch (error) {
            alert('Ошибка загрузки услуги: ' + error.message);
        }
    } else {
        document.getElementById('serviceModalTitle').textContent = 'Добавить услугу';
        document.getElementById('serviceForm').reset();
        document.getElementById('serviceId').value = '';
    }
    
    modal.classList.add('active');
}

async function saveService() {
    const serviceId = document.getElementById('serviceId').value;
    const serviceData = {
        name: document.getElementById('serviceName').value,
        description: document.getElementById('serviceDescription').value,
        price: parseInt(document.getElementById('servicePrice').value),
        duration: parseInt(document.getElementById('serviceDuration').value),
        icon: document.getElementById('serviceIcon').value
    };
    
    try {
        if (serviceId) {
            await apiCall(`/services/${serviceId}`, {
                method: 'PUT',
                body: JSON.stringify(serviceData)
            });
        } else {
            await apiCall('/services', {
                method: 'POST',
                body: JSON.stringify(serviceData)
            });
        }
        
        await loadServices();
        closeModal('serviceModal');
    } catch (error) {
        alert('Ошибка сохранения услуги: ' + error.message);
    }
}

async function editService(id) {
    await openServiceModal(id);
}

async function deleteService(id) {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return;
    
    try {
        await apiCall(`/services/${id}`, { method: 'DELETE' });
        await loadServices();
    } catch (error) {
        alert('Ошибка удаления услуги: ' + error.message);
    }
}

// Gallery Management
function initializeGallery() {
    const uploadInput = document.getElementById('imageUpload');
    const uploadArea = document.getElementById('uploadArea');
    
    uploadInput.addEventListener('change', handleImageUpload);
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--secondary-color)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#e0e0e0';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#e0e0e0';
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
}

async function handleImageUpload(e) {
    await handleFiles(e.target.files);
}

async function handleFiles(files) {
    for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
            await uploadGalleryImage(file);
        }
    }
}

async function uploadGalleryImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`${API_BASE_URL}/api/gallery`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        await loadGallery();
    } catch (error) {
        alert('Ошибка загрузки изображения: ' + error.message);
    }
}

async function loadGallery() {
    try {
        const gallery = await apiCall('/gallery');
        renderGallery(gallery);
    } catch (error) {
        console.error('Error loading gallery:', error);
        document.getElementById('galleryGridAdmin').innerHTML = '<p style="color: var(--danger);">Ошибка загрузки галереи</p>';
    }
}

function renderGallery(gallery) {
    const container = document.getElementById('galleryGridAdmin');
    if (gallery.length === 0) {
        container.innerHTML = '<p style="color: var(--text-gray);">Галерея пуста. Загрузите фото.</p>';
        return;
    }
    
    container.innerHTML = gallery.map((item, index) => {
        const imageUrl = item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL}${item.image_url}`;
        return `
            <div class="gallery-item-admin">
                <img src="${imageUrl}" alt="Gallery image ${index + 1}">
                <button class="delete-btn" onclick="deleteGalleryImage(${item.id})" title="Удалить">×</button>
            </div>
        `;
    }).join('');
}

async function deleteGalleryImage(id) {
    if (!confirm('Удалить это фото?')) return;
    
    try {
        await apiCall(`/gallery/${id}`, { method: 'DELETE' });
        await loadGallery();
    } catch (error) {
        alert('Ошибка удаления фото: ' + error.message);
    }
}

// Masters Management
function initializeMasters() {
    document.getElementById('addMasterBtn').addEventListener('click', () => {
        openMasterModal();
    });
    
    document.getElementById('masterForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveMaster();
    });
}

async function loadMasters() {
    try {
        const masters = await apiCall('/masters');
        renderMasters(masters);
    } catch (error) {
        console.error('Error loading masters:', error);
        document.getElementById('mastersListAdmin').innerHTML = '<p style="color: var(--danger);">Ошибка загрузки мастеров</p>';
    }
}

function renderMasters(masters) {
    const container = document.getElementById('mastersListAdmin');
    if (masters.length === 0) {
        container.innerHTML = '<p style="color: var(--text-gray);">Мастеров пока нет. Добавьте первого мастера.</p>';
        return;
    }
    
    container.innerHTML = masters.map(master => `
        <div class="master-item-admin">
            <div class="master-icon-admin">${master.icon || '👨‍💼'}</div>
            <h3>${master.name}</h3>
            <div class="master-specialty-admin">${master.specialty || 'Барбер'}</div>
            <div class="master-experience-admin">Опыт: ${master.experience || 0} лет</div>
            <p style="color: var(--text-gray); font-size: 0.9rem; margin-bottom: 1rem;">${master.description || ''}</p>
            <div class="service-actions">
                <button class="btn btn-primary btn-sm" onclick="editMaster(${master.id})">✏️ Редактировать</button>
                <button class="btn btn-danger btn-sm" onclick="deleteMaster(${master.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

async function openMasterModal(masterId = null) {
    const modal = document.getElementById('masterModal');
    
    if (masterId) {
        try {
            const masters = await apiCall('/masters');
            const master = masters.find(m => m.id === masterId);
            if (master) {
                document.getElementById('masterModalTitle').textContent = 'Редактировать мастера';
                document.getElementById('masterId').value = master.id;
                document.getElementById('masterName').value = master.name;
                document.getElementById('masterSpecialty').value = master.specialty || '';
                document.getElementById('masterExperience').value = master.experience || 0;
                document.getElementById('masterDescription').value = master.description || '';
                document.getElementById('masterIcon').value = master.icon || '👨‍💼';
            }
        } catch (error) {
            alert('Ошибка загрузки мастера: ' + error.message);
        }
    } else {
        document.getElementById('masterModalTitle').textContent = 'Добавить мастера';
        document.getElementById('masterForm').reset();
        document.getElementById('masterId').value = '';
    }
    
    modal.classList.add('active');
}

async function saveMaster() {
    const masterId = document.getElementById('masterId').value;
    const masterData = {
        name: document.getElementById('masterName').value,
        specialty: document.getElementById('masterSpecialty').value,
        experience: parseInt(document.getElementById('masterExperience').value),
        description: document.getElementById('masterDescription').value,
        icon: document.getElementById('masterIcon').value
    };
    
    try {
        if (masterId) {
            await apiCall(`/masters/${masterId}`, {
                method: 'PUT',
                body: JSON.stringify(masterData)
            });
        } else {
            await apiCall('/masters', {
                method: 'POST',
                body: JSON.stringify(masterData)
            });
        }
        
        await loadMasters();
        closeModal('masterModal');
    } catch (error) {
        alert('Ошибка сохранения мастера: ' + error.message);
    }
}

async function editMaster(id) {
    await openMasterModal(id);
}

async function deleteMaster(id) {
    if (!confirm('Вы уверены, что хотите удалить этого мастера?')) return;
    
    try {
        await apiCall(`/masters/${id}`, { method: 'DELETE' });
        await loadMasters();
    } catch (error) {
        alert('Ошибка удаления мастера: ' + error.message);
    }
}

// Reviews Management
function initializeReviews() {
    loadReviews();
}

async function loadReviews() {
    try {
        const reviews = await apiCall('/reviews');
        renderReviews(reviews);
    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('reviewsListAdmin').innerHTML = '<p style="color: var(--danger);">Ошибка загрузки отзывов</p>';
    }
}

function renderReviews(reviews) {
    const container = document.getElementById('reviewsListAdmin');
    if (reviews.length === 0) {
        container.innerHTML = '<p style="color: var(--text-gray);">Отзывов пока нет.</p>';
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <div class="review-item-admin">
            <div class="review-header-admin">
                <div>
                    <div class="review-author-admin">${review.author}</div>
                    <div class="review-rating-admin">${'⭐'.repeat(review.rating)}</div>
                </div>
                <div style="color: var(--text-gray); font-size: 0.9rem;">${review.date}</div>
            </div>
            <div class="review-text-admin">${review.text}</div>
            <div class="service-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteReview(${review.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

async function deleteReview(id) {
    if (!confirm('Удалить этот отзыв?')) return;
    
    try {
        await apiCall(`/reviews/${id}`, { method: 'DELETE' });
        await loadReviews();
    } catch (error) {
        alert('Ошибка удаления отзыва: ' + error.message);
    }
}

// Settings Management
function initializeSettings() {
    loadSettings();
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
}

async function loadSettings() {
    try {
        const settings = await apiCall('/settings');
        document.getElementById('settingAddress').value = settings.address || 'Ташкент, Узбекистан';
        document.getElementById('settingPhone').value = settings.phone || '+998 (XX) XXX-XX-XX';
        document.getElementById('settingHours').value = settings.hours || 'Пн - Вс: 10:00 - 20:00';
        document.getElementById('settingInstagram').value = settings.instagram || '';
        document.getElementById('settingTelegram').value = settings.telegram || '';
        document.getElementById('settingFacebook').value = settings.facebook || '';
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    const settings = {
        address: document.getElementById('settingAddress').value,
        phone: document.getElementById('settingPhone').value,
        hours: document.getElementById('settingHours').value,
        instagram: document.getElementById('settingInstagram').value,
        telegram: document.getElementById('settingTelegram').value,
        facebook: document.getElementById('settingFacebook').value
    };
    
    try {
        await apiCall('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        alert('Настройки сохранены!');
    } catch (error) {
        alert('Ошибка сохранения настроек: ' + error.message);
    }
}

// Modals
function initializeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        
        closeBtn.addEventListener('click', () => closeModal(modal.id));
        cancelBtn?.addEventListener('click', () => closeModal(modal.id));
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Load all data
async function loadData() {
    await Promise.all([
        loadServices(),
        loadGallery(),
        loadMasters(),
        loadReviews()
    ]);
}

// Make functions global for onclick handlers
window.editService = editService;
window.deleteService = deleteService;
window.editMaster = editMaster;
window.deleteMaster = deleteMaster;
window.deleteReview = deleteReview;
window.deleteGalleryImage = deleteGalleryImage;

