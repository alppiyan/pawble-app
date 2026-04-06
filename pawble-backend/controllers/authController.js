const db = require('../config/db');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
    const { name, surname, email, password, location } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (name, surname, email, password, location) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [name, surname, email, hashedPassword, location], (err, result) => {
            if (err) {
                if(err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Bu e-posta zaten kayıtlı.' });
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, userId: result.insertId });
        });
    } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

exports.login = (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false, message: 'Hatalı giriş.' });
        
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            // Kullanıcının hayvanlarını çek
            db.query('SELECT * FROM pets WHERE user_id = ?', [user.id], (err, pets) => {
                const hasPet = pets.length > 0;
                const activePetId = hasPet ? pets[0].id : null;
                delete user.password;
                res.json({ success: true, user, hasPet, activePetId, pets });
            });
        } else {
            res.status(401).json({ success: false, message: 'Hatalı şifre.' });
        }
    });
};
exports.updateUser = (req, res) => {
    const userId = req.params.userId;
    const { name, surname, location } = req.body;
    
    const sql = 'UPDATE users SET name = ?, surname = ?, location = ? WHERE id = ?';
    db.query(sql, [name, surname, location, userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Güncel kullanıcı bilgisini geri dönelim
        db.query('SELECT * FROM users WHERE id = ?', [userId], (err, users) => {
            const user = users[0];
            delete user.password;
            res.json({ success: true, user });
        });
    });
}; 
exports.updateUser = (req, res) => {
    const userId = req.params.userId;
    const { name, surname, location } = req.body;
    
    const sql = 'UPDATE users SET name = ?, surname = ?, location = ? WHERE id = ?';
    db.query(sql, [name, surname, location, userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Güncel kullanıcı bilgisini geri dönelim
        db.query('SELECT * FROM users WHERE id = ?', [userId], (err, users) => {
            const user = users[0];
            delete user.password;
            res.json({ success: true, user });
        });
    });
};