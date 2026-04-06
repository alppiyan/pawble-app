const db = require('../config/db');

// Kullanıcının sohbet ettiği kişileri listele (Gelen Kutusu)
exports.getConversations = (req, res) => {
    const userId = req.params.userId;
    
    const sql = `
        SELECT DISTINCT 
            CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as otherUserId,
            MAX(sent_at) as lastMessageTime,
            (SELECT content FROM messages m2 WHERE (m2.sender_id = ? AND m2.receiver_id = otherUserId) OR (m2.sender_id = otherUserId AND m2.receiver_id = ?) ORDER BY sent_at DESC LIMIT 1) as lastMessage
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY otherUserId
        ORDER BY lastMessageTime DESC
    `;
    
    db.query(sql, [userId, userId, userId, userId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.json([]);

        const promises = results.map(conv => {
            return new Promise((resolve) => {
                const userSql = `SELECT name, surname FROM users WHERE id = ?`;
                
                // 1. İhtimal: Eşleşme durumu kontrolü (MATING)
                const matchSql = `
                    SELECT p.id as petId, p.user_id as petOwnerId, p.goal, p.username as petName, p.image_path as petImage
                    FROM likes l
                    JOIN pets p ON p.id = l.liked_pet_id
                    JOIN pets p2 ON p2.id = l.liker_pet_id
                    WHERE (p.user_id = ? AND p2.user_id = ?) 
                       OR (p.user_id = ? AND p2.user_id = ?)
                    LIMIT 1
                `;

                // 2. İhtimal: Eşleşme yoksa Sahiplenme ilanı var mı? (ADOPTION)
                const adoptionSql = `
                    SELECT id as petId, user_id as petOwnerId, goal, username as petName, image_path as petImage
                    FROM pets
                    WHERE user_id = ? AND goal = 'adoption'
                    LIMIT 1
                `;

                db.query(userSql, [conv.otherUserId], (err, userRes) => {
                    if (err || userRes.length === 0) { resolve(null); return; }
                    
                    db.query(matchSql, [userId, conv.otherUserId, conv.otherUserId, userId], (err, matchRes) => {
                        if (matchRes && matchRes.length > 0) {
                            // Eşleşme var! (Mating sekmesine gider)
                            resolveConversation(resolve, conv, userRes[0], matchRes[0]);
                        } else {
                            // Eşleşme yok! Demek ki biri ilan üzerinden direkt yazmış
                            db.query(adoptionSql, [conv.otherUserId], (err, adoptionRes) => {
                                const context = (adoptionRes && adoptionRes.length > 0) ? adoptionRes[0] : {
                                    goal: 'adoption', // KESİNLİKLE ADOPTION (Sahiplenme sekmesine gider)
                                    petName: 'Dostumuz',
                                    petImage: null
                                };
                                resolveConversation(resolve, conv, userRes[0], context);
                            });
                        }
                    });
                });
                
                function resolveConversation(resolve, conv, user, context) {
                    resolve({
                        otherUserId: conv.otherUserId,
                        userName: user.name + ' ' + user.surname,
                        image: context.petImage || 'https://placehold.co/150',
                        petName: context.petName,
                        goal: context.goal, // Burası frontend'e gidip filtreyi çalıştıracak!
                        lastMessage: conv.lastMessage,
                        time: new Date(conv.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    });
                }
            });
        });

        Promise.all(promises).then(data => res.json(data.filter(i => i)));
    });
};

exports.getMessages = (req, res) => {
    const { userId, otherId } = req.params;
    const sql = `SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY sent_at ASC`;
    db.query(sql, [userId, otherId, otherId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.sendMessage = (req, res) => {
    const { senderId, receiverId, content } = req.body;
    const sql = 'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)';
    db.query(sql, [senderId, receiverId, content], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true });
    });
};