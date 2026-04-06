const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dir = 'public/uploads';
        if (file.fieldname === 'video') { dir = 'public/uploads/videos'; }
        if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true }); }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const prefix = file.fieldname === 'video' ? 'video-pet-' : 'pet-';
        cb(null, prefix + Date.now() + path.extname(file.originalname));
    }
});

const uploadMulti = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'video') {
            const extname = /mp4|avi|mov|mkv/.test(path.extname(file.originalname).toLowerCase());
            if (extname) return cb(null, true);
            cb(new Error('Sadece video dosyaları kabul edilir!'));
        } else {
            cb(null, true);
        }
    }
});

const cpUpload = uploadMulti.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]);

// --- MEVCUT ROTALAR ---
router.post('/pets', cpUpload, petController.addPet);
router.put('/pets/:petId', cpUpload, petController.updatePet);
router.delete('/pets/:petId', petController.deletePet);
router.get('/pets/user/:userId', petController.getUserPets);
router.get('/metadata', petController.getMetadata);
router.get('/candidates', petController.getCandidates);
router.post('/like', petController.likePet);
router.get('/stats/:petId', petController.getPetStats);
router.get('/history', petController.getInteractionHistory);
router.post('/adopt', petController.adoptPet);

// --- ADMİN ROTALARI ---
router.get('/users', petController.getUsers);
router.put('/users/:userId/shelter', petController.toggleShelter);

// BU SATIR HER ZAMAN DOSYANIN EN ALTINDA OLMALIDIR!
module.exports = router;