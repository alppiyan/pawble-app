const mysql = require('mysql2');
require('dotenv').config(); // Gizli kasayı (.env) sisteme bağlar

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err);
        return;
    }
    console.log('✅ Veritabanına Gizli Kimlikle Başarıyla Bağlanıldı!');
});

module.exports = db;