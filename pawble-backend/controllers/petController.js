const db = require('../config/db');
const fs = require('fs');

// 1. PET EKLEME
exports.addPet = (req, res) => {
    const { userId, name, speciesId, breedId, gender, age, vaccinated, description, goal } = req.body;
    const PORT = process.env.PORT || 3000;
    
    const imagePath = req.files && req.files['image'] ? `http://localhost:${PORT}/uploads/${req.files['image'][0].filename}` : 'https://via.placeholder.com/400';
    const videoPath = req.files && req.files['video'] ? `http://localhost:${PORT}/uploads/videos/${req.files['video'][0].filename}` : null;
    
    const isVaccinated = (vaccinated === 'true' || vaccinated === 'on' || vaccinated === 1) ? 1 : 0;

    const sql = `INSERT INTO pets (user_id, username, species_id, breed_id, gender, age, vaccinated, description, image_path, goal, video_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [userId, name, speciesId, breedId, gender, age, isVaccinated, description, imagePath, goal, videoPath], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Pet eklendi!', petId: result.insertId });
    });
};

// 2. KULLANICININ HAYVANLARINI GETİR
exports.getUserPets = (req, res) => {
    const userId = req.params.userId;
    const sql = `
        SELECT p.*, s.name as species_name, b.name as breed_name 
        FROM pets p
        JOIN species s ON p.species_id = s.id
        JOIN breeds b ON p.breed_id = b.id
        WHERE p.user_id = ?
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// 3. TÜR VE IRK BİLGİLERİ
exports.getMetadata = (req, res) => {
    db.query('SELECT * FROM species', (err, species) => {
        db.query('SELECT * FROM breeds', (err, breeds) => {
            res.json({ species, breeds });
        });
    });
};

// 4. ADAYLARI GETİR (Aynı kişileri tekrar karşımıza ÇIKARMAZ)
exports.getCandidates = (req, res) => {
    const { mode, myPetId, species, gender, ageMin, ageMax, isShelter } = req.query;
    
    let sql = `
        SELECT p.id, p.username as name, p.gender, p.age, p.vaccinated, p.description, 
               p.image_path as image, p.video_path,
               s.name as species_name, b.name as breed_name, u.location, p.goal, 
               p.user_id as ownerId, CONCAT(u.name, ' ', u.surname) as ownerName, 
               u.is_shelter
        FROM pets p
        JOIN species s ON p.species_id = s.id
        JOIN breeds b ON p.breed_id = b.id
        JOIN users u ON p.user_id = u.id
        WHERE p.goal = ? 
    `;

    let params = [mode || 'mating'];

    if (myPetId && myPetId != 0) {
        sql += ` AND p.id != ?`;
        params.push(myPetId);

        // EN KRİTİK KISIM: Daha önce etkileşime girilenleri getirme!
        sql += ` AND p.id NOT IN (SELECT liked_pet_id FROM likes WHERE liker_pet_id = ?)`;
        params.push(myPetId);
    }

    if (species) { sql += ` AND s.name = ?`; params.push(species); }
    if (gender) { sql += ` AND p.gender = ?`; params.push(gender); }
    if (ageMin) { sql += ` AND p.age >= ?`; params.push(ageMin); }
    if (ageMax) { sql += ` AND p.age <= ?`; params.push(ageMax); }

    if (isShelter === 'true') { 
        sql += ` AND u.is_shelter = 1`; 
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).send(err.message); 
        }
        
        const candidates = results.map(pet => ({
            ...pet,
            vaccinated: pet.vaccinated === 1,
            breed: pet.breed_name,
            species: pet.species_name,
            is_shelter: pet.is_shelter === 1 
        }));
        res.json(candidates);
    });
};

// 5. BEĞENİ İŞLEMİ
exports.likePet = (req, res) => {
    const { likerId, likedId, action } = req.body; 
    let status = action === 'left' ? 'rejected' : (action === 'super' ? 'super' : 'pending');

    const insertSql = 'INSERT INTO likes (liker_pet_id, liked_pet_id, status) VALUES (?, ?, ?)';
    db.query(insertSql, [likerId, likedId, status], (err) => {
        if (err) return res.json({ match: false }); 
        if (status === 'rejected') return res.json({ match: false });

        const checkMatch = 'SELECT * FROM likes WHERE liker_pet_id = ? AND liked_pet_id = ? AND status IN ("pending", "super", "matched")';
        db.query(checkMatch, [likedId, likerId], (err, results) => {
            if (results.length > 0) {
                const update = 'UPDATE likes SET status = "matched" WHERE (liker_pet_id = ? AND liked_pet_id = ?) OR (liker_pet_id = ? AND liked_pet_id = ?)';
                db.query(update, [likerId, likedId, likedId, likerId]);
                return res.json({ match: true, isSuper: status === 'super' });
            }
            res.json({ match: false, isSuper: status === 'super' });
        });
    });
};

// 6. FAVORİLER
exports.getFavorites = (req, res) => {
    const { myPetId } = req.query;
    const sql = `
        SELECT p.id, p.username as name, p.image_path as image, b.name as breed_name, p.user_id as ownerId
        FROM likes l
        JOIN pets p ON l.liked_pet_id = p.id
        JOIN breeds b ON p.breed_id = b.id
        WHERE l.liker_pet_id = ? AND l.status = 'super'
    `;
    db.query(sql, [myPetId], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

// 7. PET SİLME (Ve Dosyaları Temizleme)
exports.deletePet = (req, res) => {
    const petId = req.params.petId;

    const selectSql = 'SELECT image_path, video_path FROM pets WHERE id = ?';
    
    db.query(selectSql, [petId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Silinecek pet bulunamadı.' });

        const pet = results[0];

        const deleteSql = 'DELETE FROM pets WHERE id = ?';
        db.query(deleteSql, [petId], (deleteErr, result) => {
            if (deleteErr) return res.status(500).json({ error: deleteErr.message });

            const deletePhysicalFile = (fileUrl) => {
                if (!fileUrl || fileUrl.includes('placehold') || fileUrl.includes('placeholder')) return;

                try {
                    const parts = fileUrl.split('/uploads/');
                    if (parts.length > 1) {
                        const localPath = 'uploads/' + parts[1]; 
                        if (fs.existsSync(localPath)) {
                            fs.unlinkSync(localPath);
                            console.log(`🗑️ Dosya başarıyla silindi: ${localPath}`);
                        }
                    }
                } catch (e) {
                    console.error("Dosya silinirken hata oluştu:", e.message);
                }
            };

            deletePhysicalFile(pet.image_path);
            deletePhysicalFile(pet.video_path);

            res.json({ success: true, message: 'Pet ve medyaları kalıcı olarak silindi.' });
        });
    });
};

// 8. PET GÜNCELLEME
exports.updatePet = (req, res) => {
    const petId = req.params.petId;
    const { name, speciesId, breedId, gender, age, vaccinated, description, goal } = req.body;
    const isVaccinated = (vaccinated === 'true' || vaccinated === 'on' || vaccinated === 1) ? 1 : 0;
    const PORT = process.env.PORT || 3000;
    
    let sql = 'UPDATE pets SET username=?, species_id=?, breed_id=?, gender=?, age=?, vaccinated=?, description=?, goal=?';
    let params = [name, speciesId, breedId, gender, age, isVaccinated, description, goal];

    if (req.files && req.files['image']) {
        const imagePath = `http://localhost:${PORT}/uploads/${req.files['image'][0].filename}`;
        sql += ', image_path=?';
        params.push(imagePath);
    }
    
    if (req.files && req.files['video']) {
        const videoPath = `http://localhost:${PORT}/uploads/${req.files['video'][0].filename}`;
        sql += ', video_path=?';
        params.push(videoPath);
    }

    sql += ' WHERE id=?';
    params.push(petId);

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Pet güncellendi.' });
    });
};

// 9. İSTATİSTİKLER
exports.getPetStats = (req, res) => {
    const petId = req.params.petId;
    const sql = `
        SELECT 
            COUNT(CASE WHEN status IN ('matched', 'pending') THEN 1 END) as likeCount,
            COUNT(CASE WHEN status = 'super' THEN 1 END) as superCount,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as dislikeCount,
            COUNT(CASE WHEN status = 'matched' THEN 1 END) as matchCount
        FROM likes 
        WHERE liked_pet_id = ?
    `;
    db.query(sql, [petId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
};

// 10. ETKİLEŞİM GEÇMİŞİ (Veritabanını çökerten hata temizlendi!)
exports.getInteractionHistory = (req, res) => {
    const { myPetId, type } = req.query;
    let statusCondition = "";
    if (type === 'super') statusCondition = "l.status = 'super'";
    else statusCondition = "l.status IN ('matched', 'pending')";

    const sql = `
        SELECT p.id, p.username as name, p.image_path as image, p.description, p.gender, p.age, p.vaccinated,
               b.name as breed_name, p.user_id as ownerId, u.location,
               CONCAT(u.name, ' ', u.surname) as ownerName
        FROM likes l
        JOIN pets p ON l.liked_pet_id = p.id
        JOIN breeds b ON p.breed_id = b.id
        JOIN users u ON p.user_id = u.id
        WHERE l.liker_pet_id = ? AND ${statusCondition}
    `;

    db.query(sql, [myPetId], (err, results) => {
        if (err) {
            console.error("Favori Çekme Hatası:", err);
            return res.status(500).json({ error: err.message });
        }
        const finalResults = results.map(r => ({...r, vaccinated: r.vaccinated === 1}));
        res.json(finalResults);
    });
};

// 11. SAHİPLENDİRME ONAYI
exports.adoptPet = (req, res) => {
    const { petId, newOwnerId, currentOwnerId } = req.body;

    const checkOwnerSql = "SELECT user_id FROM pets WHERE id = ?";
    
    db.query(checkOwnerSql, [petId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0 || results[0].user_id != currentOwnerId) {
            return res.status(403).json({ success: false, message: "Bu işlem için yetkiniz yok." });
        }

        const updateSql = "UPDATE pets SET user_id = ?, goal = 'mating' WHERE id = ?";
        
        db.query(updateSql, [newOwnerId, petId], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Sahiplendirme işlemi başarılı! Dostumuzun yeni bir yuvası var." });
        });
    });
};

// 12. PET VİDEO YÜKLEME
exports.uploadPetVideo = (req, res) => {
    const petId = req.params.petId;
    
    if (!req.file) {
        return res.status(400).json({ error: 'Video dosyası gerekli!' });
    }

    const PORT = process.env.PORT || 3000;
    const videoPath = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    
    const sql = 'UPDATE pets SET video_path = ? WHERE id = ?';
    db.query(sql, [videoPath, petId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Video başarıyla yüklendi!', videoPath: videoPath });
    });
};

// 13. ADMİN: KULLANICILARI GETİR
exports.getUsers = (req, res) => {
    db.query('SELECT id, name, surname, email, is_shelter FROM users WHERE is_admin = 0', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// 14. ADMİN: BARINAK YETKİSİ GÜNCELLE
exports.toggleShelter = (req, res) => {
    const { isShelter } = req.body;
    const userId = req.params.userId;
    
    db.query('UPDATE users SET is_shelter = ? WHERE id = ?', [isShelter ? 1 : 0, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Yetki güncellendi' });
    });
};