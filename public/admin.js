"use strict";

/* =========================
   Republic Admin (ONE FILE)
   - Services CRUD
   - Gallery upload + delete
   - Masters CRUD + master photo upload
   - Reviews delete
   - Settings update
   - JWT auth login/logout
========================= */

const API_BASE_URL = window.location.origin;

// ONE token key for whole project
const TOKEN_KEY = "adminToken";
let authToken = localStorage.getItem(TOKEN_KEY) || "";

/* =========================
   Helpers
========================= */
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

function showLoginScreen() {
  qs("#loginScreen").style.display = "flex";
  qs("#adminPanel").style.display = "none";
}

function showAdminPanel() {
  qs("#loginScreen").style.display = "none";
  qs("#adminPanel").style.display = "flex";
}

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}/api${endpoint}`;

  const headers = {
    ...(options.headers || {})
  };

  // only set JSON content-type when body is JSON (not FormData)
  const isFormData = options.body instanceof FormData;
  if (!isFormData) headers["Content-Type"] = "application/json";

  if (authToken && !endpoint.includes("/auth/login")) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, { ...options, headers });

  // auto logout on auth error
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem(TOKEN_KEY);
    authToken = "";
    showLoginScreen();
    throw new Error("Сессия истекла. Войдите заново.");
  }

  let data = {};
  try { data = await response.json(); } catch { /* ignore */ }

  if (!response.ok) {
    throw new Error(data.error || `Ошибка API: ${response.status}`);
  }

  return data;
}

/* =========================
   Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Ensure required hidden fields exist (no crashes)
  ensureMasterHiddenFields();

  checkAuth();
  initializeLogin();
  initializeNavigation();
  initializeModals();
  initializeSections();

  if (authToken) loadData();
});

function checkAuth() {
  if (authToken) showAdminPanel();
  else showLoginScreen();
}

function ensureMasterHiddenFields() {
  const form = qs("#masterForm");
  if (!form) return;

  if (!qs("#masterPhotoUrl")) {
    const inp = document.createElement("input");
    inp.type = "hidden";
    inp.id = "masterPhotoUrl";
    form.appendChild(inp);
  }

  if (!qs("#masterIcon")) {
    const inp = document.createElement("input");
    inp.type = "hidden";
    inp.id = "masterIcon";
    inp.value = "👨‍💼";
    form.appendChild(inp);
  }
}

/* =========================
   Auth (login/logout)
========================= */
function initializeLogin() {
  const loginForm = qs("#loginForm");
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = qs("#loginUsername").value.trim();
    const password = qs("#loginPassword").value;

    try {
      const data = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });

      authToken = data.token;
      localStorage.setItem(TOKEN_KEY, authToken);

      showAdminPanel();
      await loadData();
    } catch (error) {
      alert("Неверный логин или пароль: " + error.message);
    }
  });

  qs("#logoutBtn").addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    authToken = "";
    showLoginScreen();
  });
}

/* =========================
   Navigation
========================= */
function initializeNavigation() {
  const navItems = qsa(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      navItems.forEach(ni => ni.classList.remove("active"));
      item.classList.add("active");

      showSection(section);
    });
  });
}

function showSection(sectionName) {
  const sections = qsa(".admin-section");
  sections.forEach(section => section.classList.remove("active"));
  qs(`#${sectionName}-section`).classList.add("active");
}

/* =========================
   Modals
========================= */
function initializeModals() {
  const modals = qsa(".modal");
  modals.forEach(modal => {
    const closeBtn = qs(".modal-close", modal);
    const cancelBtn = qs(".modal-cancel", modal);

    closeBtn?.addEventListener("click", () => closeModal(modal.id));
    cancelBtn?.addEventListener("click", () => closeModal(modal.id));

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
}

function closeModal(modalId) {
  qs(`#${modalId}`).classList.remove("active");
}

/* =========================
   Sections init
========================= */
function initializeSections() {
  initializeServices();
  initializeProducts();
  initializeOrders();
  initializeGallery();
  initializeMasters();
  initializeReviews();
  initializeSettings();
}

/* =========================
   SERVICES
========================= */
function initializeServices() {
  qs("#addServiceBtn").addEventListener("click", () => openServiceModal());

  qs("#serviceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveService();
  });
}

async function loadServices() {
  const services = await apiCall("/services");
  renderServices(services);
}

function renderServices(services) {
  const container = qs("#servicesList");
  if (!services.length) {
    container.innerHTML = '<p style="color: var(--text-gray);">Услуг пока нет. Добавьте первую услугу.</p>';
    return;
  }

  container.innerHTML = services.map(service => `
    <div class="service-item-admin">
      <div class="service-icon-admin">${service.icon || "✂️"}</div>
      <div class="service-info-admin">
        <h3>${service.name}</h3>
        <p>${service.description || ""}</p>
        <div class="service-price-admin">${Number(service.price).toLocaleString()} сум • ${service.duration} мин</div>
      </div>
      <div class="service-actions">
        <button class="btn btn-primary btn-sm" onclick="editService(${service.id})">✏️ Редактировать</button>
        <button class="btn btn-danger btn-sm" onclick="deleteService(${service.id})">🗑️ Удалить</button>
      </div>
    </div>
  `).join("");
}

async function openServiceModal(serviceId = null) {
  const modal = qs("#serviceModal");

  if (serviceId) {
    const services = await apiCall("/services");
    const service = services.find(s => s.id === serviceId);
    if (service) {
      qs("#serviceModalTitle").textContent = "Редактировать услугу";
      qs("#serviceId").value = service.id;
      qs("#serviceName").value = service.name || "";
      qs("#serviceDescription").value = service.description || "";
      qs("#servicePrice").value = service.price || 0;
      qs("#serviceDuration").value = service.duration || 0;
      qs("#serviceIcon").value = service.icon || "💇";
    }
  } else {
    qs("#serviceModalTitle").textContent = "Добавить услугу";
    qs("#serviceForm").reset();
    qs("#serviceId").value = "";
  }

  modal.classList.add("active");
}

async function saveService() {
  const serviceId = qs("#serviceId").value;
  const serviceData = {
    name: qs("#serviceName").value.trim(),
    description: qs("#serviceDescription").value.trim(),
    price: parseInt(qs("#servicePrice").value, 10),
    duration: parseInt(qs("#serviceDuration").value, 10),
    icon: qs("#serviceIcon").value.trim()
  };

  try {
    if (serviceId) {
      await apiCall(`/services/${serviceId}`, { method: "PUT", body: JSON.stringify(serviceData) });
    } else {
      await apiCall("/services", { method: "POST", body: JSON.stringify(serviceData) });
    }
    await loadServices();
    closeModal("serviceModal");
  } catch (error) {
    alert("Ошибка сохранения услуги: " + error.message);
  }
}

async function editService(id) { await openServiceModal(id); }

async function deleteService(id) {
  if (!confirm("Вы уверены, что хотите удалить эту услугу?")) return;
  try {
    await apiCall(`/services/${id}`, { method: "DELETE" });
    await loadServices();
  } catch (error) {
    alert("Ошибка удаления услуги: " + error.message);
  }
}

/* =========================
   GALLERY
========================= */
function initializeGallery() {
  const uploadInput = qs("#imageUpload");
  const uploadArea = qs("#uploadArea");

  uploadInput.addEventListener("change", (e) => handleFiles(e.target.files));

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "var(--secondary-color)";
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.style.borderColor = "#e0e0e0";
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "#e0e0e0";
    handleFiles(e.dataTransfer.files);
  });
}

async function handleFiles(files) {
  for (const file of Array.from(files || [])) {
    if (file.type.startsWith("image/")) {
      await uploadGalleryImage(file);
    }
  }
}

async function uploadGalleryImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  try {
    await apiCall("/gallery", { method: "POST", body: formData });
    await loadGallery();
  } catch (error) {
    alert("Ошибка загрузки изображения: " + error.message);
  }
}

async function loadGallery() {
  const gallery = await apiCall("/gallery");
  renderGallery(gallery);
}

function renderGallery(gallery) {
  const container = qs("#galleryGridAdmin");
  container.innerHTML = "";

  if (!gallery.length) {
    container.innerHTML = '<p style="color: var(--text-gray);">Галерея пуста. Загрузите фото.</p>';
    return;
  }

  gallery.forEach((item, index) => {
    const imageUrl = item.image_url.startsWith("http") ? item.image_url : `${API_BASE_URL}${item.image_url}`;

    const galleryItem = document.createElement("div");
    galleryItem.className = "gallery-item-admin";

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = `Gallery image ${index + 1}`;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.title = "Удалить";
    deleteBtn.innerHTML = "×";
    deleteBtn.onclick = () => deleteGalleryImage(item.id);

    galleryItem.appendChild(img);
    galleryItem.appendChild(deleteBtn);
    container.appendChild(galleryItem);
  });
}

async function deleteGalleryImage(id) {
  if (!confirm("Удалить это фото?")) return;
  try {
    await apiCall(`/gallery/${id}`, { method: "DELETE" });
    await loadGallery();
  } catch (error) {
    alert("Ошибка удаления фото: " + error.message);
  }
}

/* =========================
   MASTERS + MASTER PHOTO
========================= */
function initializeMasters() {
  qs("#addMasterBtn").addEventListener("click", () => openMasterModal());

  qs("#masterForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveMaster();
  });

  // preview selected photo
  const input = qs("#masterPhoto");
  input?.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;

    const prev = qs("#masterPhotoPreview");
    if (prev) {
      prev.src = URL.createObjectURL(file);
      prev.style.display = "block";
    }
  });
}

async function loadMasters() {
  const masters = await apiCall("/masters");
  renderMasters(masters);
}

function renderMasters(masters) {
  const container = qs("#mastersListAdmin");
  if (!masters.length) {
    container.innerHTML = '<p style="color: var(--text-gray);">Мастеров пока нет. Добавьте первого мастера.</p>';
    return;
  }

  container.innerHTML = masters.map(master => {
    const photo = master.photo_url ? `<img src="${API_BASE_URL}${master.photo_url}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;object-position: center top;background-color: #fff;filter: brightness(0.95) contrast(0.95);border:2px solid #d4af37;" />`
      : `<div class="master-icon-admin">${master.icon || "👨‍💼"}</div>`;

    return `
      <div class="master-item-admin">
        ${photo}
        <h3>${master.name}</h3>
        <div class="master-specialty-admin">${master.specialty || "Барбер"}</div>
        <div class="master-experience-admin">Опыт: ${master.experience || 0} лет</div>
        <p style="color: var(--text-gray); font-size: 0.9rem; margin-bottom: 1rem;">${master.description || ""}</p>
        <div class="service-actions">
          <button class="btn btn-primary btn-sm" onclick="editMaster(${master.id})">✏️ Редактировать</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMaster(${master.id})">🗑️ Удалить</button>
        </div>
      </div>
    `;
  }).join("");
}

async function openMasterModal(masterId = null) {
  const modal = qs("#masterModal");

  // reset form properly
  qs("#masterForm").reset();
  qs("#masterId").value = "";
  qs("#masterPhotoUrl").value = "";
  qs("#masterIcon").value = qs("#masterIcon").value || "👨‍💼";

  // reset preview and file input
  const prev = qs("#masterPhotoPreview");
  if (prev) { prev.src = ""; prev.style.display = "none"; }
  const fileInput = qs("#masterPhoto");
  if (fileInput) fileInput.value = ""; // allowed to clear

  if (masterId) {
    const masters = await apiCall("/masters");
    const master = masters.find(m => m.id === masterId);
    if (master) {
      qs("#masterModalTitle").textContent = "Редактировать мастера";
      qs("#masterId").value = master.id;
      qs("#masterName").value = master.name || "";
      qs("#masterSpecialty").value = master.specialty || "";
      qs("#masterExperience").value = master.experience || 0;
      qs("#masterDescription").value = master.description || "";
      qs("#masterIcon").value = master.icon || "👨‍💼";
      qs("#masterPhotoUrl").value = master.photo_url || "";

      if (master.photo_url && prev) {
        prev.src = `${API_BASE_URL}${master.photo_url}`;
        prev.style.display = "block";
      }
    }
  } else {
    qs("#masterModalTitle").textContent = "Добавить мастера";
  }

  modal.classList.add("active");
}

async function uploadMasterPhoto(file) {
  const formData = new FormData();
  formData.append("photo", file);

  // Use apiCall so auth + errors consistent
  const data = await apiCall("/upload-master-photo", {
    method: "POST",
    body: formData
  });

  // expected: { success:true, path:"/uploads/masters/..." }
  if (!data.path) throw new Error("Сервер не вернул путь к файлу");
  return data.path;
}

async function saveMaster() {
  const masterId = qs("#masterId").value;

  const name = qs("#masterName").value.trim();
  const specialty = qs("#masterSpecialty").value.trim();
  const experience = parseInt(qs("#masterExperience").value || "0", 10);
  const description = qs("#masterDescription").value.trim();
  const icon = qs("#masterIcon").value.trim() || "👨‍💼";

  if (!name) return alert("Введите имя мастера");
  if (!description) return alert("Введите описание");
  if (Number.isNaN(experience) || experience < 0) return alert("Опыт должен быть числом");

  // current saved photo_url (edit mode)
  let photo_url = qs("#masterPhotoUrl").value || null;

  // if user selected new file -> upload and override photo_url
  const file = qs("#masterPhoto").files?.[0];
  if (file) {
    try {
      photo_url = await uploadMasterPhoto(file);
    } catch (e) {
      return alert("Ошибка загрузки фото: " + e.message);
    }
  }

  const masterData = { name, specialty, experience, description, icon, photo_url };

  try {
    if (masterId) {
      await apiCall(`/masters/${masterId}`, { method: "PUT", body: JSON.stringify(masterData) });
    } else {
      await apiCall("/masters", { method: "POST", body: JSON.stringify(masterData) });
    }

    await loadMasters();
    closeModal("masterModal");
  } catch (error) {
    alert("Ошибка сохранения мастера: " + error.message);
  }
}

async function editMaster(id) { await openMasterModal(id); }

async function deleteMaster(id) {
  if (!confirm("Вы уверены, что хотите удалить этого мастера?")) return;
  try {
    await apiCall(`/masters/${id}`, { method: "DELETE" });
    await loadMasters();
  } catch (error) {
    alert("Ошибка удаления мастера: " + error.message);
  }
}

/* =========================
   REVIEWS
========================= */
function initializeReviews() {
  // auto load in loadData
}

async function loadReviews() {
  const reviews = await apiCall("/reviews");
  renderReviews(reviews);
}

function renderReviews(reviews) {
  const container = qs("#reviewsListAdmin");
  if (!reviews.length) {
    container.innerHTML = '<p style="color: var(--text-gray);">Отзывов пока нет.</p>';
    return;
  }

  container.innerHTML = reviews.map(review => `
    <div class="review-item-admin">
      <div class="review-header-admin">
        <div>
          <div class="review-author-admin">${review.author}</div>
          <div class="review-rating-admin">${"⭐".repeat(review.rating)}</div>
        </div>
        <div style="color: var(--text-gray); font-size: 0.9rem;">${review.date}</div>
      </div>
      <div class="review-text-admin">${review.text}</div>
      <div class="service-actions">
        <button class="btn btn-danger btn-sm" onclick="deleteReview(${review.id})">🗑️ Удалить</button>
      </div>
    </div>
  `).join("");
}

async function deleteReview(id) {
  if (!confirm("Удалить этот отзыв?")) return;
  try {
    await apiCall(`/reviews/${id}`, { method: "DELETE" });
    await loadReviews();
  } catch (error) {
    alert("Ошибка удаления отзыва: " + error.message);
  }
}

/* =========================
   PRODUCTS
   ========================= */
function initializeProducts() {
  qs("#addProductBtn").addEventListener("click", () => openProductModal());
  qs("#productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveProduct();
  });
  
  const input = qs("#productPhoto");
  input?.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const prev = qs("#productPhotoPreview");
    if (prev) {
      prev.src = URL.createObjectURL(file);
      prev.style.display = "block";
    }
  });
}

async function loadProducts() {
  const products = await apiCall("/products");
  renderProducts(products);
}

function renderProducts(products) {
  const container = qs("#productsList");
  if (!products.length) {
    container.innerHTML = '<p style="color: var(--text-gray);">Товаров пока нет. Добавьте первый товар.</p>';
    return;
  }

  container.innerHTML = products.map(p => {
    const photo = p.image_url ? `<img src="${API_BASE_URL}${p.image_url}" style="width:64px;height:64px;border-radius:10px;object-fit:cover;border:2px solid #d4af37;" />`
      : `<div class="service-icon-admin">🛍️</div>`;

    return `
      <div class="service-item-admin" style="align-items: center;">
        ${photo}
        <div class="service-info-admin" style="margin-left: 15px;">
          <h3>${p.name}</h3>
          <p>${p.description || ""}</p>
          <div class="service-price-admin">${Number(p.price).toLocaleString()} сум • В наличии: ${p.stock} шт.</div>
        </div>
        <div class="service-actions">
          <button class="btn btn-primary btn-sm" onclick="editProduct(${p.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">🗑️</button>
        </div>
      </div>
    `;
  }).join("");
}

async function openProductModal(productId = null) {
  const modal = qs("#productModal");
  qs("#productForm").reset();
  qs("#productId").value = "";
  
  const prev = qs("#productPhotoPreview");
  if (prev) { prev.src = ""; prev.style.display = "none"; }
  if (qs("#productPhoto")) qs("#productPhoto").value = "";
  
  // store existing image url if editing
  if (!qs("#productPhotoUrl")) {
    const inp = document.createElement("input");
    inp.type = "hidden";
    inp.id = "productPhotoUrl";
    qs("#productForm").appendChild(inp);
  }
  qs("#productPhotoUrl").value = "";

  if (productId) {
    const products = await apiCall("/products");
    const product = products.find(p => p.id === productId);
    if (product) {
      qs("#productModalTitle").textContent = "Редактировать товар";
      qs("#productId").value = product.id;
      qs("#productName").value = product.name || "";
      qs("#productDescription").value = product.description || "";
      qs("#productPrice").value = product.price || 0;
      qs("#productStock").value = product.stock || 0;
      qs("#productPhotoUrl").value = product.image_url || "";

      if (product.image_url && prev) {
        prev.src = `${API_BASE_URL}${product.image_url}`;
        prev.style.display = "block";
      }
    }
  } else {
    qs("#productModalTitle").textContent = "Добавить товар";
  }

  modal.classList.add("active");
}

async function uploadProductPhoto(file) {
  const formData = new FormData();
  formData.append("photo", file);
  const data = await apiCall("/upload-product", { method: "POST", body: formData });
  if (!data.path) throw new Error("Сервер не вернул путь к файлу");
  return data.path;
}

async function saveProduct() {
  const productId = qs("#productId").value;
  const name = qs("#productName").value.trim();
  const description = qs("#productDescription").value.trim();
  const price = parseInt(qs("#productPrice").value, 10);
  const stock = parseInt(qs("#productStock").value, 10);

  let image_url = qs("#productPhotoUrl").value || null;
  const file = qs("#productPhoto").files?.[0];
  if (file) {
    try { image_url = await uploadProductPhoto(file); }
    catch (e) { return alert("Ошибка загрузки фото: " + e.message); }
  }

  const productData = { name, description, price, stock, image_url };

  try {
    if (productId) {
      await apiCall(`/products/${productId}`, { method: "PUT", body: JSON.stringify(productData) });
    } else {
      await apiCall("/products", { method: "POST", body: JSON.stringify(productData) });
    }
    await loadProducts();
    closeModal("productModal");
  } catch (error) {
    alert("Ошибка сохранения товара: " + error.message);
  }
}

window.editProduct = (id) => openProductModal(id);
window.deleteProduct = async (id) => {
  if (!confirm("Удалить этот товар?")) return;
  try {
    await apiCall(`/products/${id}`, { method: "DELETE" });
    await loadProducts();
  } catch (error) {
    alert("Ошибка удаления товара: " + error.message);
  }
};

/* =========================
   ORDERS
   ========================= */
function initializeOrders() {}

async function loadOrders() {
  const orders = await apiCall("/orders");
  renderOrders(orders);
}

function renderOrders(orders) {
  const container = qs("#ordersList");
  if (!orders.length) {
    container.innerHTML = '<p style="color: var(--text-gray);">Заказов пока нет.</p>';
    return;
  }

  container.innerHTML = orders.map(order => {
    const items = JSON.parse(order.items || "[]");
    const itemsList = items.map(i => `<li>${i.name} (${i.quantity} шт.) - ${i.price * i.quantity} сум</li>`).join("");
    
    return `
      <div class="service-item-admin" style="flex-direction: column; align-items: stretch; border-left: 4px solid ${order.status === 'pending' ? '#d4af37' : '#4caf50'};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="margin: 0;">Заказ №${order.id} <span style="font-size: 0.8rem; color: #888; font-weight: normal;">${new Date(order.created_at).toLocaleString()}</span></h3>
          <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid #ccc; background: #fff;">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>В ожидании</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Отправлен</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Завершен</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
          </select>
        </div>
        
        <div style="display: flex; gap: 20px; font-size: 0.9rem;">
          <div style="flex: 1;">
            <p style="margin: 0 0 5px;"><strong>Клиент:</strong> ${order.client_name}</p>
            <p style="margin: 0 0 5px;"><strong>Телефон:</strong> ${order.client_phone}</p>
            <p style="margin: 0 0 5px;"><strong>Адрес:</strong> ${order.address || "Не указан"}</p>
          </div>
          <div style="flex: 1;">
            <p style="margin: 0 0 5px;"><strong>Сумма:</strong> <span style="color: #d4af37; font-weight: bold;">${Number(order.total_amount).toLocaleString()} сум</span></p>
            <p style="margin: 0 0 5px;"><strong>Состав заказа:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">${itemsList}</ul>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

window.updateOrderStatus = async (id, status) => {
  try {
    await apiCall(`/orders/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    alert("Статус заказа обновлен");
  } catch (error) {
    alert("Ошибка обновления статуса: " + error.message);
  }
};

/* =========================
   SETTINGS
   ========================= */
function initializeSettings() {
  qs("#saveSettingsBtn").addEventListener("click", saveSettings);
}

async function loadSettings() {
  const settings = await apiCall("/settings");
  qs("#settingAddress").value = settings.address || "Ташкент, Узбекистан";
  qs("#settingPhone").value = settings.phone || "+998 (XX) XXX-XX-XX";
  qs("#settingHours").value = settings.hours || "Пн - Вс: 10:00 - 20:00";
  qs("#settingInstagram").value = settings.instagram || "";
  qs("#settingTelegram").value = settings.telegram || "";
  qs("#settingTelegramToken").value = settings.telegram_token || "";
  qs("#settingTelegramChatId").value = settings.telegram_chat_id || "";
}

async function saveSettings() {
  const settings = {
    address: qs("#settingAddress").value,
    phone: qs("#settingPhone").value,
    hours: qs("#settingHours").value,
    instagram: qs("#settingInstagram").value,
    telegram: qs("#settingTelegram").value,
    telegram_token: qs("#settingTelegramToken").value,
    telegram_chat_id: qs("#settingTelegramChatId").value
  };

  try {
    await apiCall("/settings", { method: "PUT", body: JSON.stringify(settings) });
    alert("Настройки сохранены!");
  } catch (error) {
    alert("Ошибка сохранения настроек: " + error.message);
  }
}

/* =========================
   Load all
========================= */
async function loadData() {
  try {
    await Promise.all([
      loadServices(),
      loadGallery(),
      loadMasters(),
      loadReviews(),
      loadSettings()
    ]);
  } catch (e) {
    console.error(e);
  }
}

/* =========================
   Global functions for onclick
========================= */
window.editService = editService;
window.deleteService = deleteService;
window.editMaster = editMaster;
window.deleteMaster = deleteMaster;
window.deleteReview = deleteReview;
window.deleteGalleryImage = deleteGalleryImage;