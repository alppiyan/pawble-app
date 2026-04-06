🐾 Pawble - Evcil Hayvan Eşleşme ve Sahiplendirme Platformu
<img width="2048" height="2048" alt="denem" src="https://github.com/user-attachments/assets/2ac83621-11d8-4018-9c7f-5aab16c051c5" />

Pawble, evcil hayvan sahiplerinin dostlarına uygun eş bulmalarını sağlayan ve aynı zamanda yuva arayan hayvanlar için sahiplendirme ilanlarının paylaşıldığı, Tinder mantığıyla çalışan modern bir web uygulamasıdır.

🌟 Özellikler

- **Tinder Tarzı Kaydırma (Swipe):** Eş bulma modunda adayları sağa (beğen), sola (geç) veya yukarı (süper beğeni/favori) kaydırarak etkileşime girme.
- **Sahiplendirme Modu:** Barınaklardan veya kişilerden gelen sahiplendirme ilanlarını liste şeklinde ve detaylı filtrelerle görebilme.
- **Akıllı Mesajlaşma Sistemi:** Kullanıcıların eşleştikleri adaylarla veya direkt sahiplenmek istedikleri hayvanların sahipleriyle gerçek zamanlı sohbet edebilmesi. (Sohbetler "Eşleşmeler" ve "Sahiplenme" olarak ayrı sekmelerde tutulur).
- **Detaylı Filtreleme:** Tür (Kedi/Köpek vb.), cinsiyet, yaş aralığı ve "Sadece Barınak İlanları" gibi gelişmiş filtreleme seçenekleri.
- **Kullanıcı Yetkilendirme & Güvenlik:** Şifreli kullanıcı girişi (Bcrypt) ve çevre değişkenleri (`.env`) ile korunan veritabanı mimarisi.
- **Admin Paneli:** Sistemdeki kullanıcıları yönetme ve barınak hesaplarını doğrulama/yetkilendirme işlemleri.

🛠️ Kullanılan Teknolojiler

**Frontend:**
- HTML5, CSS3, JavaScript (Vanilla)
- Tailwind CSS (Modern ve duyarlı tasarım için)
- FontAwesome (İkonlar için)

**Backend:**
- Node.js & Express.js (Sunucu mimarisi)
- MySQL (İlişkisel Veritabanı)
- Multer (Görsel ve video yükleme işlemleri)
- Bcrypt (Şifre güvenliği)
- Dotenv (Çevre değişkenleri yönetimi)

🚀 Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz:

1. Depoyu bilgisayarınıza klonlayın:
   ```bash
   git clone [https://github.com/KULLANICI_ADIN/Pawble-app.git](https://github.com/KULLANICI_ADIN/Pawble-app.git)
Backend klasörüne gidin ve gerekli paketleri yükleyin:

Bash
cd Pawble-app/Pawble-backend
npm install
Pawble-backend klasörü içinde bir .env dosyası oluşturun ve veritabanı ayarlarınızı girin:

Plaintext
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=veritabani_sifreniz
DB_NAME=Pawble
Sunucuyu başlatın:

Bash
node server.js
Tarayıcınızda Pawble-frontend klasöründeki index.html dosyasını açarak veya VS Code "Live Server" eklentisiyle uygulamayı görüntüleyebilirsiniz.

Created by ALP PİYAN
