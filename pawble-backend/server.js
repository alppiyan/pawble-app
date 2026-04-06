const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Rota Dosyalarını İçe Aktar
const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
const chatRoutes = require('./routes/chatRoutes'); // EKLENDİ

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Rotaları Kullan
app.use('/api', authRoutes);
app.use('/api', petRoutes);
app.use('/api', chatRoutes); // EKLENDİ

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sunucu ${PORT} portunda tüm ağa açık olarak çalışıyor!`);
});