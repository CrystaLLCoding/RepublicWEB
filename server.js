const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'republic-barbershop-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Initialize Database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize Database Schema
function initializeDatabase() {
    // Services table
    db.run(`CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Masters table
    db.run(`CREATE TABLE IF NOT EXISTS masters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        specialty TEXT,
        experience INTEGER,
        description TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Gallery table
    db.run(`CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Reviews table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        date TEXT NOT NULL,
        rating INTEGER NOT NULL,
        text TEXT NOT NULL,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert default admin user
    db.get('SELECT * FROM admin_users WHERE username = ?', ['admin'], (err, row) => {
        if (err) {
            console.error('Error checking admin user:', err);
            return;
        }
        if (!row) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run('INSERT INTO admin_users (username, password) VALUES (?, ?)', ['admin', hashedPassword], (err) => {
                if (err) {
                    console.error('Error creating default admin:', err);
                } else {
                    console.log('Default admin user created: admin / admin123');
                }
            });
        }
    });

    // Insert default settings
    const defaultSettings = [
        { key: 'address', value: 'Ташкент, Узбекистан' },
        { key: 'phone', value: '+998 (XX) XXX-XX-XX' },
        { key: 'hours', value: 'Пн - Вс: 10:00 - 20:00' },
        { key: 'instagram', value: '' },
        { key: 'telegram', value: '' },
        { key: 'facebook', value: '' }
    ];

    defaultSettings.forEach(setting => {
        db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [setting.key, setting.value]);
    });
}

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// ============ AUTH ROUTES ============

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username });
    });
});

// ============ SERVICES ROUTES ============

app.get('/api/services', (req, res) => {
    db.all('SELECT * FROM services ORDER BY id ASC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/services', authenticateToken, (req, res) => {
    const { name, description, price, duration, icon } = req.body;

    db.run(
        'INSERT INTO services (name, description, price, duration, icon) VALUES (?, ?, ?, ?, ?)',
        [name, description, price, duration, icon],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, name, description, price, duration, icon });
        }
    );
});

app.put('/api/services/:id', authenticateToken, (req, res) => {
    const { name, description, price, duration, icon } = req.body;
    const id = req.params.id;

    db.run(
        'UPDATE services SET name = ?, description = ?, price = ?, duration = ?, icon = ? WHERE id = ?',
        [name, description, price, duration, icon, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Service not found' });
            }
            res.json({ id, name, description, price, duration, icon });
        }
    );
});

app.delete('/api/services/:id', authenticateToken, (req, res) => {
    const id = req.params.id;

    db.run('DELETE FROM services WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        res.json({ message: 'Service deleted successfully' });
    });
});

// ============ MASTERS ROUTES ============

app.get('/api/masters', (req, res) => {
    db.all('SELECT * FROM masters ORDER BY id ASC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/masters', authenticateToken, (req, res) => {
    const { name, specialty, experience, description, icon } = req.body;

    db.run(
        'INSERT INTO masters (name, specialty, experience, description, icon) VALUES (?, ?, ?, ?, ?)',
        [name, specialty, experience, description, icon],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, name, specialty, experience, description, icon });
        }
    );
});

app.put('/api/masters/:id', authenticateToken, (req, res) => {
    const { name, specialty, experience, description, icon } = req.body;
    const id = req.params.id;

    db.run(
        'UPDATE masters SET name = ?, specialty = ?, experience = ?, description = ?, icon = ? WHERE id = ?',
        [name, specialty, experience, description, icon, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Master not found' });
            }
            res.json({ id, name, specialty, experience, description, icon });
        }
    );
});

app.delete('/api/masters/:id', authenticateToken, (req, res) => {
    const id = req.params.id;

    db.run('DELETE FROM masters WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Master not found' });
        }
        res.json({ message: 'Master deleted successfully' });
    });
});

// ============ GALLERY ROUTES ============

app.get('/api/gallery', (req, res) => {
    db.all('SELECT * FROM gallery ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/gallery', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    db.run('INSERT INTO gallery (image_url) VALUES (?)', [imageUrl], function(err) {
        if (err) {
            // Delete uploaded file if database insert fails
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, image_url: imageUrl });
    });
});

app.delete('/api/gallery/:id', authenticateToken, (req, res) => {
    const id = req.params.id;

    // Get image path before deleting
    db.get('SELECT image_url FROM gallery WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Delete from database
        db.run('DELETE FROM gallery WHERE id = ?', [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Delete file from filesystem
            const imagePath = path.join(__dirname, row.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }

            res.json({ message: 'Image deleted successfully' });
        });
    });
});

// ============ REVIEWS ROUTES ============

app.get('/api/reviews', (req, res) => {
    db.all('SELECT * FROM reviews ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/reviews', authenticateToken, (req, res) => {
    const { author, date, rating, text, avatar } = req.body;

    db.run(
        'INSERT INTO reviews (author, date, rating, text, avatar) VALUES (?, ?, ?, ?, ?)',
        [author, date, rating, text, avatar],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, author, date, rating, text, avatar });
        }
    );
});

app.delete('/api/reviews/:id', authenticateToken, (req, res) => {
    const id = req.params.id;

    db.run('DELETE FROM reviews WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json({ message: 'Review deleted successfully' });
    });
});

// ============ SETTINGS ROUTES ============

app.get('/api/settings', (req, res) => {
    db.all('SELECT key, value FROM settings', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    });
});

app.put('/api/settings', authenticateToken, (req, res) => {
    const settings = req.body;

    const updatePromises = Object.entries(settings).map(([key, value]) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP',
                [key, value, value],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });

    Promise.all(updatePromises)
        .then(() => {
            res.json({ message: 'Settings updated successfully', settings });
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

// Serve static files from root directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve static files from root directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`API: http://localhost:${PORT}/api`);
});

