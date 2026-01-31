const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "republic-barbershop-secret-key-2024";

/* =========================
   Middleware
   ========================= */
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   Ensure uploads dirs exist
   ========================= */
const uploadsDir = path.join(__dirname, "uploads");
const mastersDir = path.join(uploadsDir, "masters");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(mastersDir)) fs.mkdirSync(mastersDir, { recursive: true });

/* =========================
   Multer: Gallery Upload
   ========================= */
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "gallery-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error("Only image files are allowed!"));
};

const uploadGallery = multer({
  storage: galleryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: imageFilter,
});

/* =========================
   Multer: Masters Photo Upload
   ========================= */
const masterStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mastersDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const uploadMaster = multer({
  storage: masterStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 2MB
  fileFilter: imageFilter,
});

/* =========================
   Database init
   ========================= */
const dbPath = path.join(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database");
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Masters table with photo_url
  db.run(`CREATE TABLE IF NOT EXISTS masters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT,
    experience INTEGER,
    description TEXT,
    icon TEXT,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    date TEXT NOT NULL,
    rating INTEGER NOT NULL,
    text TEXT NOT NULL,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    service TEXT NOT NULL,
    master TEXT,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert default admin user
  db.get("SELECT * FROM admin_users WHERE username = ?", ["admin"], (err, row) => {
    if (err) {
      console.error("Error checking admin user:", err);
      return;
    }
    if (!row) {
      const hashedPassword = bcrypt.hashSync("adminbbrepublic", 10);
      db.run(
        "INSERT INTO admin_users (username, password) VALUES (?, ?)",
        ["admin", hashedPassword],
        (err2) => {
          if (err2) console.error("Error creating default admin:", err2);
          else console.log("Default admin user created: admin / adminbbrepublic");
        }
      );
    }
  });

  // Insert default settings
  const defaultSettings = [
    { key: "address", value: "Ташкент, Узбекистан" },
    { key: "phone", value: "+998 (XX) XXX-XX-XX" },
    { key: "hours", value: "Пн - Вс: 10:00 - 20:00" },
    { key: "instagram", value: "" },
    { key: "telegram", value: "" },
    { key: "telegram_token", value: "" },
    { key: "telegram_chat_id", value: "" },
  ];

  defaultSettings.forEach((s) => {
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [s.key, s.value]);
  });
}

/* =========================
   Auth middleware
   ========================= */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

/* =========================
   AUTH
   ========================= */
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM admin_users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, username: user.username });
  });
});

/* =========================
   MASTERS PHOTO UPLOAD
   ========================= */
app.post("/api/upload-master-photo", authenticateToken, uploadMaster.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не загружен" });

  res.json({
    success: true,
    path: `/uploads/masters/${req.file.filename}`,
  });
});

/* =========================
   SERVICES
   ========================= */
app.get("/api/services", (req, res) => {
  db.all("SELECT * FROM services ORDER BY id ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/services", authenticateToken, (req, res) => {
  const { name, description, price, duration, icon } = req.body;

  if (!name || price == null || duration == null) {
    return res.status(400).json({ error: "Missing required fields: name, price, duration" });
  }
  if (typeof price !== "number" || price <= 0) return res.status(400).json({ error: "Price must be a positive number" });
  if (typeof duration !== "number" || duration <= 0) return res.status(400).json({ error: "Duration must be a positive number" });

  db.run(
    "INSERT INTO services (name, description, price, duration, icon) VALUES (?, ?, ?, ?, ?)",
    [name, description, price, duration, icon],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, description, price, duration, icon });
    }
  );
});

app.put("/api/services/:id", authenticateToken, (req, res) => {
  const { name, description, price, duration, icon } = req.body;
  const id = req.params.id;

  if (!name || price == null || duration == null) {
    return res.status(400).json({ error: "Missing required fields: name, price, duration" });
  }
  if (typeof price !== "number" || price <= 0) return res.status(400).json({ error: "Price must be a positive number" });
  if (typeof duration !== "number" || duration <= 0) return res.status(400).json({ error: "Duration must be a positive number" });

  db.run(
    "UPDATE services SET name = ?, description = ?, price = ?, duration = ?, icon = ? WHERE id = ?",
    [name, description, price, duration, icon, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: "Service not found" });
      res.json({ id, name, description, price, duration, icon });
    }
  );
});

app.delete("/api/services/:id", authenticateToken, (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM services WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Service not found" });
    res.json({ message: "Service deleted successfully" });
  });
});

/* =========================
   MASTERS
   ========================= */
app.get("/api/masters", (req, res) => {
  db.all("SELECT * FROM masters ORDER BY id ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create master (optionally with photo_url from upload endpoint)
app.post("/api/masters", authenticateToken, (req, res) => {
  const { name, specialty, experience, description, icon, photo_url } = req.body;
  if (!name) return res.status(400).json({ error: "Missing required field: name" });
  if (experience != null && (typeof experience !== "number" || experience < 0)) {
    return res.status(400).json({ error: "Experience must be a non-negative number" });
  }

  db.run(
    "INSERT INTO masters (name, specialty, experience, description, icon, photo_url) VALUES (?, ?, ?, ?, ?, ?)",
    [name, specialty, experience, description, icon, photo_url || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, specialty, experience, description, icon, photo_url: photo_url || null });
    }
  );
});

// Update master
app.put("/api/masters/:id", authenticateToken, (req, res) => {
  const { name, specialty, experience, description, icon, photo_url } = req.body;
  const id = req.params.id;

  db.get("SELECT * FROM masters WHERE id = ?", [id], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!existing) return res.status(404).json({ error: "Master not found" });

    db.run(
      "UPDATE masters SET name = ?, specialty = ?, experience = ?, description = ?, icon = ?, photo_url = ? WHERE id = ?",
      [
        name ?? existing.name,
        specialty ?? existing.specialty,
        experience ?? existing.experience,
        description ?? existing.description,
        icon ?? existing.icon,
        photo_url ?? existing.photo_url,
        id,
      ],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ id, name, specialty, experience, description, icon, photo_url });
      }
    );
  });
});

// Delete master + delete photo file if exists
app.delete("/api/masters/:id", authenticateToken, (req, res) => {
  const id = req.params.id;

  db.get("SELECT photo_url FROM masters WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Master not found" });

    db.run("DELETE FROM masters WHERE id = ?", [id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });

      // delete file if exists
      if (row.photo_url) {
        const filePath = path.join(__dirname, row.photo_url.replace(/^\//, "")); // remove first "/"
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
        }
      }

      res.json({ message: "Master deleted successfully" });
    });
  });
});

/* =========================
   GALLERY
   ========================= */
app.get("/api/gallery", (req, res) => {
  db.all("SELECT * FROM gallery ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/gallery", authenticateToken, uploadGallery.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });

  const imageUrl = `/uploads/${req.file.filename}`;

  db.run("INSERT INTO gallery (image_url) VALUES (?)", [imageUrl], function (err) {
    if (err) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, image_url: imageUrl });
  });
});

app.delete("/api/gallery/:id", authenticateToken, (req, res) => {
  const id = req.params.id;

  db.get("SELECT image_url FROM gallery WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Image not found" });

    db.run("DELETE FROM gallery WHERE id = ?", [id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });

      const filePath = path.join(__dirname, row.image_url.replace(/^\//, ""));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }

      res.json({ message: "Image deleted successfully" });
    });
  });
});

/* =========================
   REVIEWS
   ========================= */
app.get("/api/reviews", (req, res) => {
  db.all("SELECT * FROM reviews ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/reviews", authenticateToken, (req, res) => {
  const { author, date, rating, text, avatar } = req.body;

  if (!author || !date || rating == null || !text) {
    return res.status(400).json({ error: "Missing required fields: author, date, rating, text" });
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be a number between 1 and 5" });
  }

  db.run(
    "INSERT INTO reviews (author, date, rating, text, avatar) VALUES (?, ?, ?, ?, ?)",
    [author, date, rating, text, avatar],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, author, date, rating, text, avatar });
    }
  );
});

app.delete("/api/reviews/:id", authenticateToken, (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM reviews WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Review not found" });
    res.json({ message: "Review deleted successfully" });
  });
});

/* =========================
   CONTACT (Telegram)
   ========================= */
app.post("/api/contact", (req, res) => {
  const { name, phone, email, message } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Missing required fields: name, phone" });

  db.all("SELECT key, value FROM settings WHERE key IN (?, ?)", ["telegram_token", "telegram_chat_id"], (err, rows) => {
    if (err) return res.status(500).json({ error: "Internal server error" });

    const settings = {};
    rows.forEach((r) => (settings[r.key] = r.value));

    if (settings.telegram_token && settings.telegram_chat_id) {
      const telegramMessage = `
📩 *Новая заявка с сайта*

👤 *Имя:* ${name}
📞 *Телефон:* ${phone}
📧 *Email:* ${email || "Не указан"}
💬 *Сообщение:*
${message || "Без сообщения"}
      `;

      const https = require("https");
      const data = JSON.stringify({
        chat_id: settings.telegram_chat_id,
        text: telegramMessage,
        parse_mode: "Markdown",
      });

      const options = {
        hostname: "api.telegram.org",
        port: 443,
        path: `/bot${settings.telegram_token}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      };

      const reqTelegram = https.request(options, (resTelegram) => {
        let responseData = "";
        resTelegram.on("data", (chunk) => (responseData += chunk));
        resTelegram.on("end", () => {
          if (resTelegram.statusCode === 200) res.json({ message: "Message sent successfully" });
          else res.json({ message: "Message saved but failed to send notification" });
        });
      });

      reqTelegram.on("error", () => res.json({ message: "Message saved but failed to send notification" }));
      reqTelegram.write(data);
      reqTelegram.end();
    } else {
      res.json({ message: "Application received (Telegram not configured)" });
    }
  });
});

/* =========================
   SETTINGS
   ========================= */
app.get("/api/settings", (req, res) => {
  db.all("SELECT key, value FROM settings", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const settings = {};
    rows.forEach((row) => (settings[row.key] = row.value));
    res.json(settings);
  });
});

app.put("/api/settings", authenticateToken, (req, res) => {
  const settings = req.body;

  const updatePromises = Object.entries(settings).map(([key, value]) => {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP",
        [key, value, value],
        (err) => (err ? reject(err) : resolve())
      );
    });
  });

  Promise.all(updatePromises)
    .then(() => res.json({ message: "Settings updated successfully", settings }))
    .catch((err) => res.status(500).json({ error: err.message }));
});

/* =========================
   BOOKINGS
   ========================= */
app.get("/api/bookings", authenticateToken, (req, res) => {
  db.all("SELECT * FROM bookings ORDER BY booking_date DESC, booking_time DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/bookings", (req, res) => {
  const { client_name, client_phone, client_email, service, master, booking_date, booking_time, notes } = req.body;

  if (!client_name || !client_phone || !service || !booking_date || !booking_time) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    "INSERT INTO bookings (client_name, client_phone, client_email, service, master, booking_date, booking_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [client_name, client_phone, client_email, service, master, booking_date, booking_time, notes],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        id: this.lastID,
        client_name,
        client_phone,
        client_email,
        service,
        master,
        booking_date,
        booking_time,
        notes,
        status: "pending",
      });
    }
  );
});

app.put("/api/bookings/:id", authenticateToken, (req, res) => {
  const { status, notes } = req.body;
  const id = req.params.id;

  db.run("UPDATE bookings SET status = ?, notes = ? WHERE id = ?", [status, notes, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Booking not found" });
    res.json({ id, status, notes });
  });
});

app.delete("/api/bookings/:id", authenticateToken, (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM bookings WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Booking not found" });
    res.json({ message: "Booking deleted successfully" });
  });
});

/* =========================
   Static pages
   ========================= */
app.use(express.static(__dirname, { index: false }));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "admin.html")));

/* 404 */
app.use((req, res) => res.status(404).json({ error: "Not found" }));

/* Start */
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`API: http://localhost:${PORT}/api`);
});
