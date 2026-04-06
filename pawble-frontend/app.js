// --- STATE ---
let currentUser = null;
let myPetId = null;
let myUserPetsList = [];
let currentPets = [];
let speciesList = [];
let breedsList = [];
let currentMode = '';
let activeFilters = { species: [], gender: [], ageMin: null, ageMax: null , shelterOnly: false };
let mockFavorites = []; 
let currentChatUserId = null;
let currentSelectedPet = null;
let chatInterval = null;
let editingPetId = null;
let historyPetsList = [];
let currentChatTab = 'mating';

// API URL
const currentHost = window.location.hostname; 
const SERVER_URL = `http://${currentHost}:3000`;
const API_BASE_URL = `http://${currentHost}:3000/api`;



window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    
    // Yarım saniye bekletip (şov amaçlı) sonra yumuşakça kapatıyoruz
    setTimeout(() => {
        preloader.classList.add('fade-out');
        
        // Animasyon bitince DOM'dan tamamen gizle
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 700);
    }, 1500); 
});

function fixMediaUrl(url) {
    if (!url) return null;
    
    // Eğer veritabanından 'localhost' gelirse, onu o anki IP ile değiştirir (Telefonlar için hayat kurtarır!)
    if (url.includes('localhost')) {
        return url.replace('localhost', currentHost);
    }
    
    return url;
}

function getPlaceholderImage(size = 400) {
    // Offline placeholder - SVG data URI
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Crect fill='%23e5e7eb' width='${size}' height='${size}'/%3E%3Ctext x='50%25' y='50%25' font-size='14' fill='%23999' text-anchor='middle' dy='.3em'%3EImage not available%3C/text%3E%3C/svg%3E`;
}



// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    fetch(`${API_BASE_URL}/metadata`)
        .then(res => res.json())
        .then(data => { speciesList = data.species; breedsList = data.breeds; populateSpecies(); })
        .catch(console.error);
});

function populateSpecies() {
    const select = document.getElementById('pet-species');
    if(select) select.innerHTML = '<option value="">Seçiniz</option>' + speciesList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}
function filterBreeds() {
    const speciesId = document.getElementById('pet-species').value;
    const breedSelect = document.getElementById('pet-breed');
    const filtered = breedsList.filter(b => b.species_id == speciesId);
    breedSelect.innerHTML = filtered.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
}

function previewVideo(input) {
    const videoPreview = document.getElementById('video-preview-el');
    const placeholder = document.getElementById('video-placeholder');
    
    if (input.files && input.files[0]) {
        // Eğer önceden yüklenmiş bir video URL'si varsa, hafızayı temizle
        if (videoPreview.src) {
            URL.revokeObjectURL(videoPreview.src);
        }
        
        // Videoyu referans olarak bağla
        videoPreview.src = URL.createObjectURL(input.files[0]);
        videoPreview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        videoPreview.play();
    }
}
// --- APP LOGIC ---
function selectMode(mode) {
    try {
        currentMode = mode;
        resetFilters(); 
        const swipeContainer = document.getElementById('swipe-container');
        const adoptionFeed = document.getElementById('adoption-feed');
        const headerTitle = document.getElementById('header-title');
        
        if (mode === 'mating') {
            swipeContainer.style.display = 'flex'; adoptionFeed.style.display = 'none'; headerTitle.innerText = 'Eşleşme';
        } else {
            swipeContainer.style.display = 'none'; adoptionFeed.style.display = 'block'; headerTitle.innerText = 'Sahiplen';
        }
        fetchCandidates();
        switchScreen('screen-mode-selection', 'screen-home');
        document.getElementById('bottom-nav').classList.remove('hidden');
    } catch(e) { console.error(e); }
}

async function fetchCandidates() {
    // YENİ: isShelter parametresi buraya eklendi
    const params = new URLSearchParams({ 
        mode: currentMode, 
        myPetId: myPetId || 0, 
        species: activeFilters.species[0] || '', 
        gender: activeFilters.gender[0] || '', 
        ageMin: activeFilters.ageMin || '', 
        ageMax: activeFilters.ageMax || '',
        isShelter: activeFilters.shelterOnly ? 'true' : '' 
    });
    
    try {
        const res = await fetch(`${API_BASE_URL}/candidates?${params}`);
        currentPets = await res.json();
        const noCards = document.getElementById('no-more-cards');
        const swipeActions = document.getElementById('swipe-actions');
        const noAdoption = document.getElementById('no-adoption-pets');

        if (currentMode === 'mating') {
            if (currentPets.length === 0) { 
                noCards.classList.remove('hidden'); noCards.classList.add('flex'); swipeActions.classList.add('hidden'); 
            } else { 
                noCards.classList.add('hidden'); swipeActions.classList.remove('hidden'); renderCards(); 
            }
        } else {
            if (currentPets.length === 0) { 
                noAdoption.classList.remove('hidden'); noAdoption.classList.add('flex'); document.getElementById('adoption-grid').innerHTML = ''; 
            } else { 
                noAdoption.classList.add('hidden'); noAdoption.classList.remove('flex'); renderAdoptionFeed(); 
            }
        }
    } catch(e) { console.error(e); }
}

// --- AUTH ---
async function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const res = await fetch(`${API_BASE_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            if (data.hasPet) myPetId = data.activePetId;
                        createFloatingPaws();

            // Giriş yapan adminse paneli göster
if (currentUser.is_admin === 1) {
    document.getElementById('admin-panel-btn').classList.remove('hidden');
} else {
    document.getElementById('admin-panel-btn').classList.add('hidden');
}
            
            document.getElementById('profile-name').innerText = `${currentUser.name} ${currentUser.surname}`;
            document.getElementById('profile-detail').innerText = currentUser.location;
            
            fetchUserPets(currentUser.id);
            document.getElementById('user-name-display').innerText = currentUser.name;
            switchScreen('screen-login', 'screen-mode-selection');
        } else { alert("Giriş başarısız: " + data.message); }
    } catch (error) { alert("Bağlantı hatası"); }
}

async function fetchUserPets(userId) {
    try {
        const res = await fetch(`${API_BASE_URL}/pets/user/${userId}`);
        const pets = await res.json();
        myUserPetsList = pets;
        const listContainer = document.getElementById('my-pets-list');
        
        if (pets.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-400 text-sm">Henüz kayıtlı dostun yok.</p>';
        } else {
            listContainer.innerHTML = pets.map(p => `
                <div class="flex items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-50 dark:border-gray-700">
                    <img src="${p.image_path || getPlaceholderImage(150)}" class="w-12 h-12 rounded-full object-cover">
                    <div class="flex-1">
                        <h4 class="font-bold text-dark dark:text-white text-sm">${p.username}</h4>
                        <p class="text-xs text-gray-500">${p.breed_name || 'Bilinmiyor'}</p>
                        <div class="flex gap-2 mt-1 text-[10px]">
                            <span class="text-green-500"><i class="fas fa-heart"></i> <span id="stat-like-${p.id}">0</span></span>
                            <span class="text-blue-500"><i class="fas fa-star"></i> <span id="stat-super-${p.id}">0</span></span>
                            <span class="text-red-500"><i class="fas fa-times"></i> <span id="stat-dislike-${p.id}">0</span></span>
                        </div>
                    </div>
                     <div class="flex gap-2">
                         <button onclick="openEditPetForm(${p.id})" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500"><i class="fas fa-pen text-xs"></i></button>
                         <button onclick="deletePet(${p.id})" class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500"><i class="fas fa-trash text-xs"></i></button>
                    </div>
                </div>
            `).join('');
            
            pets.forEach(p => fetchPetStats(p.id));
            if(!myPetId && pets.length > 0) myPetId = pets[0].id;
        }
    } catch (e) { console.error("Petler getirilemedi", e); }
}

async function fetchPetStats(petId) {
    try {
        const res = await fetch(`${API_BASE_URL}/stats/${petId}`);
        const stats = await res.json();
        if(stats) {
            const likeEl = document.getElementById(`stat-like-${petId}`);
            const superEl = document.getElementById(`stat-super-${petId}`);
            const dislikeEl = document.getElementById(`stat-dislike-${petId}`);
            if(likeEl) likeEl.innerText = stats.likeCount || 0;
            if(superEl) superEl.innerText = stats.superCount || 0;
            if(dislikeEl) dislikeEl.innerText = stats.dislikeCount || 0;
        }
    } catch(e) { console.error("Stats hatası", e); }
}

async function deletePet(id) {
    if(!confirm("Bu dostunu silmek istediğine emin misin?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/pets/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if(data.success) { fetchUserPets(currentUser.id); } else { alert("Silinemedi."); }
    } catch(e) { console.error(e); }
}

async function handleSavePet(event) {
    // 1. EN KRİTİK SATIR: Formun sayfayı yenilemesini (refresh) engeller!
    if (event) event.preventDefault();

    const isEdit = editingPetId !== null;
    const url = isEdit ? `${API_BASE_URL}/pets/${editingPetId}` : `${API_BASE_URL}/pets`;
    const method = isEdit ? 'PUT' : 'POST';

    const formData = new FormData();
    formData.append('userId', currentUser.id);
    formData.append('name', document.getElementById('pet-name').value);
    formData.append('speciesId', document.getElementById('pet-species').value);
    formData.append('breedId', document.getElementById('pet-breed').value);
    formData.append('gender', document.getElementById('pet-gender').value);
    formData.append('age', document.getElementById('pet-age').value);
    formData.append('vaccinated', document.getElementById('pet-vaccine').checked);
    formData.append('description', document.getElementById('pet-desc').value);
    
    const goalInput = document.querySelector('input[name="pet-goal"]:checked');
    formData.append('goal', goalInput ? goalInput.value : 'mating'); 
    
    const fileInput = document.getElementById('pet-image');
    if(fileInput.files[0]) formData.append('image', fileInput.files[0]);
    
    const videoInput = document.getElementById('pet-video');
    if(videoInput && videoInput.files[0]) formData.append('video', videoInput.files[0]);

    try {
        const res = await fetch(url, { method: method, body: formData });
        const data = await res.json();
        
        if(data.success) {
            alert(isEdit ? "Güncellendi!" : "Eklendi!");
            
            // Profil sayfasındaki listeyi güncelle
            fetchUserPets(currentUser.id);
            
            // Formu gizle ve Profil ekranına dön (Giriş ekranına değil!)
            hideAddPetForm(); 
        } else { 
            alert("Hata: " + data.error); 
        }
    } catch(e) { 
        console.error(e); 
    }
}

// --- USER PROFILE UPDATE ---
function openEditUserModal() {
    document.getElementById('edit-user-name').value = currentUser.name;
    document.getElementById('edit-user-surname').value = currentUser.surname;
    document.getElementById('edit-user-location').value = currentUser.location;
    document.getElementById('edit-user-modal').classList.add('open');
}
function closeEditUserModal() { document.getElementById('edit-user-modal').classList.remove('open'); }
async function handleUpdateUser() {
    const name = document.getElementById('edit-user-name').value;
    const surname = document.getElementById('edit-user-surname').value;
    const location = document.getElementById('edit-user-location').value;
    try {
        const res = await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, surname, location })
        });
        const data = await res.json();
        if(data.success) {
            currentUser = data.user;
            document.getElementById('profile-name').innerText = `${currentUser.name} ${currentUser.surname}`;
            document.getElementById('profile-detail').innerText = currentUser.location;
            closeEditUserModal();
        }
    } catch(e) { console.error(e); }
}

async function registerUser() {
    const name = document.getElementById('reg-name').value;
    const surname = document.getElementById('reg-surname').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const location = document.getElementById('reg-location').value;
    try {
        const res = await fetch(`${API_BASE_URL}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, surname, email, password, location }) });
        const data = await res.json();
        if(data.success) { alert("Kayıt başarılı, lütfen giriş yapın."); switchScreen('screen-register', 'screen-login'); } 
        else { alert("Hata: " + data.error); }
    } catch(e) { console.error(e); }
}

// --- PET DÜZENLEME FORMU AÇMA ---
function openEditPetForm(petId) {
    // 1. Düzenlenecek hayvanı kullanıcının hayvanları arasından bul
    const pet = myUserPetsList.find(p => p.id === petId);
    if (!pet) return;

    // 2. Sisteme "Şu an düzenleme modundayız" bilgisini ver
    editingPetId = petId;

    // 3. Başlıkları ve Butonları "Güncelle" moduna çevir
    document.getElementById('pet-form-title').innerText = "Dostunu Düzenle ✏️";
    document.getElementById('save-pet-btn').innerText = "Güncelle";

    // 4. Mevcut bilgileri formdaki kutucuklara doldur
    document.getElementById('pet-name').value = pet.username || '';
    document.getElementById('pet-species').value = pet.species_id || '';
    
    // Tür seçimine göre ırk listesini filtrele
    filterBreeds(); 
    
    document.getElementById('pet-breed').value = pet.breed_id || '';
    document.getElementById('pet-gender').value = pet.gender || 'erkek';
    document.getElementById('pet-age').value = pet.age || '1';
    document.getElementById('pet-vaccine').checked = pet.vaccinated;
    document.getElementById('pet-desc').value = pet.description || '';

    // Hedef (Goal) Radyo Butonunu Seç
    const goalInput = document.querySelector(`input[name="pet-goal"][value="${pet.goal || 'mating'}"]`);
    if (goalInput) goalInput.checked = true;

    // 5. Görsel Önizlemeyi Ayarla
    const imgPreview = document.getElementById('pet-preview');
    const imgPlaceholder = document.getElementById('upload-placeholder');
    if (pet.image_path && !pet.image_path.includes('placehold')) {
        imgPreview.src = pet.image_path;
        imgPreview.classList.remove('hidden');
        imgPlaceholder.classList.add('hidden');
    } else {
        imgPreview.src = '';
        imgPreview.classList.add('hidden');
        imgPlaceholder.classList.remove('hidden');
    }

    // 6. Video Önizlemeyi Ayarla
    const videoPreview = document.getElementById('video-preview-el');
    const videoPlaceholder = document.getElementById('video-placeholder');
    if (videoPreview && pet.video_path) {
        let vidUrl = pet.video_path;
        if (!vidUrl.startsWith('http')) {
            vidUrl = `${SERVER_URL}/${vidUrl}`;
        }
        videoPreview.src = vidUrl;
        videoPreview.classList.remove('hidden');
        if (videoPlaceholder) videoPlaceholder.classList.add('hidden');
    } else if (videoPreview) {
        videoPreview.src = '';
        videoPreview.classList.add('hidden');
        if (videoPlaceholder) videoPlaceholder.classList.remove('hidden');
    }

    // 7. Ekranı Geçiş Yap (Profil'den Form'a)
    document.getElementById('screen-profile').classList.remove('active');
    document.getElementById('screen-add-pet').classList.add('active'); 
}

// --- UI HELPERS ---
// --- GENEL EKRAN DEĞİŞTİRİCİ ---
function switchScreen(from, to) {
    document.getElementById(from).classList.remove('active');
    const toEl = document.getElementById(to);
    toEl.classList.add('active');
    toEl.style.opacity = 0;
    setTimeout(()=> toEl.style.opacity = 1, 50);
}

function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    ['screen-home', 'screen-profile', 'screen-favorites', 'screen-matches', 'screen-conversation'].forEach(id => document.getElementById(id).classList.remove('active'));
    stopChatPolling();
    
    if (tab === 'home') document.getElementById('screen-home').classList.add('active');
    else if (tab === 'favorites') { 
        document.getElementById('screen-favorites').classList.add('active'); 
        switchHistoryTab('favorites'); 
    }
    else if (tab === 'matches') { document.getElementById('screen-matches').classList.add('active'); Conversations(); }
    else if (tab === 'profile') document.getElementById('screen-profile').classList.add('active');
}

async function switchHistoryTab(type) {
    document.getElementById('tab-favorites').classList.remove('active');
    document.getElementById('tab-likes').classList.remove('active');
    document.getElementById(`tab-${type}`).classList.add('active');
    
    const container = document.getElementById('favorites-grid');
    const emptyState = document.getElementById('no-favorites');
    
    try {
        const res = await fetch(`${API_BASE_URL}/history?myPetId=${myPetId}&type=${type === 'favorites' ? 'super' : 'like'}`);
        const list = await res.json();
        historyPetsList = list;

        if (list.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden'); emptyState.classList.add('flex');
        } else {
            emptyState.classList.add('hidden'); emptyState.classList.remove('flex');
            container.innerHTML = list.map(pet => `
                <div onclick="openPetDetail(${pet.id})" class="adoption-card bg-white dark:bg-gray-800 rounded-3xl p-2 shadow-soft cursor-pointer">
                    <div class="h-32 rounded-2xl bg-gray-200 overflow-hidden relative">
                        <img src="${pet.image || getPlaceholderImage(400)}" class="w-full h-full object-cover">
                        <div class="absolute top-2 right-2 ${type==='favorites'?'bg-blue-500':'bg-pink-500'} text-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                            <i class="fas ${type==='favorites'?'fa-star':'fa-heart'} text-xs"></i>
                        </div>
                    </div>
                    <div class="px-2 py-3"><h3 class="font-bold text-dark dark:text-white">${pet.name}</h3><p class="text-xs text-gray-400">${pet.breed_name || ''}</p></div>
                </div>
            `).join('');
        }
    } catch(e) { console.error("History fetch error", e); }
}

function goBackToSelection() { switchScreen('screen-home', 'screen-mode-selection'); document.getElementById('bottom-nav').classList.add('hidden'); }
function toggleDarkMode() { document.documentElement.classList.toggle('dark'); }

function openAddPetForm() {
    editingPetId = null;
    document.getElementById('pet-form-title').innerText = "Dostunu Ekle 🐾";
    document.getElementById('save-pet-btn').innerText = "Kaydet";
    document.getElementById('pet-name').value = '';
    document.getElementById('pet-age').value = '1';
    document.getElementById('pet-desc').value = '';
    
    // Görselleri Sıfırla
    document.getElementById('pet-preview').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
    document.getElementById('pet-image').value = '';
    
    // Videoyu Sıfırla ve Durdur
    const videoPreview = document.getElementById('video-preview-el');
    if (videoPreview) {
        videoPreview.pause(); // Arka planda çalıyorsa durdur
        videoPreview.src = ''; // Kaynağı boşalt
        videoPreview.classList.add('hidden'); // Gizle
    }
    document.getElementById('video-placeholder').classList.remove('hidden');
    document.getElementById('pet-video').value = '';

    // Ekranı Değiştir
    document.getElementById('screen-add-pet').classList.add('active'); 
    document.getElementById('screen-profile').classList.remove('active');
}
function hideAddPetForm() { document.getElementById('screen-add-pet').classList.remove('active'); document.getElementById('screen-profile').classList.add('active'); }

// --- FILTER ---
function openFilterModal() { document.getElementById('filter-modal').classList.add('open'); }
function closeFilterModal() { document.getElementById('filter-modal').classList.remove('open'); }

function toggleFilter(type, value) {
    const btn = document.getElementById(`filter-${type}-${value}`);
    const idx = activeFilters[type].indexOf(value);
    if(idx > -1) { activeFilters[type].splice(idx, 1); btn.classList.remove('selected'); } 
    else { activeFilters[type].push(value); btn.classList.add('selected'); }
}

// YENİ: Barınak Filtreleme Butonunun Mantığı
function toggleShelterFilter() {
    activeFilters.shelterOnly = !activeFilters.shelterOnly;
    const btn = document.getElementById('filter-shelter-btn');
    
    if (activeFilters.shelterOnly) {
        btn.classList.add('selected', 'bg-purple-50', 'border-purple-500', 'text-purple-700');
    } else {
        btn.classList.remove('selected', 'bg-purple-50', 'border-purple-500', 'text-purple-700');
    }
}

// GÜNCELLENDİ: Filtreleri Sıfırlama
function resetFilters() {
    // shelterOnly: false buraya eklendi
    activeFilters = { species: [], gender: [], ageMin: null, ageMax: null, shelterOnly: false };
    
    document.querySelectorAll('.filter-chip').forEach(el => {
        el.classList.remove('selected', 'bg-purple-50', 'border-purple-500', 'text-purple-700');
    });
    
    if(document.getElementById('filter-age-min')) document.getElementById('filter-age-min').value = '';
    if(document.getElementById('filter-age-max')) document.getElementById('filter-age-max').value = '';
}

// GÜNCELLENDİ: Filtreleri Uygulama
function applyFilters() {
    activeFilters.ageMin = document.getElementById('filter-age-min').value;
    activeFilters.ageMax = document.getElementById('filter-age-max').value;
    fetchCandidates(); 
    closeFilterModal();
}
// --- CHAT SYSTEM ---
function initiateChatFromModal() {
    if (!currentSelectedPet) return;
    closePetDetail();
    openChatScreen(currentSelectedPet.ownerId, currentSelectedPet.ownerName, currentSelectedPet.image);
}

// --- DÜZENLENMİŞ SOHBET AÇMA FONKSİYONU ---
function openChatScreen(ownerId, ownerName, ownerImage) {
    currentChatUserId = ownerId;
    document.getElementById('chat-header-name').innerText = ownerName || "Kullanıcı";
    document.getElementById('chat-header-img').src = ownerImage || getPlaceholderImage(150);
    
    // 1. KRİTİK DÜZELTME: 'screen-matches' silinmemesi için bu listeden çıkarıldı!
    ['screen-home', 'screen-profile', 'screen-favorites'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.remove('active');
    });
    
    // 2. Masaüstü Grid yapısı için ana menüyü açık tut
    document.getElementById('screen-matches').classList.add('active');
    
    // 3. Konuşma penceresini aktif et
    document.getElementById('screen-conversation').classList.add('active');
    
    // Mobilde (telefon ekranında) sohbet açılınca sol menüyü gizleme hilesi
    if (window.innerWidth < 768) {
        const chatList = document.querySelector('#screen-matches > .px-6');
        if (chatList) chatList.style.display = 'none';
    }
    
    startChatPolling(ownerId);
}
function startChatPolling(otherId) {
    if (chatInterval) clearInterval(chatInterval);
    fetchMessages(otherId); 
    chatInterval = setInterval(() => fetchMessages(otherId), 2000); 
}

function stopChatPolling() {
    if (chatInterval) {
        clearInterval(chatInterval);
        chatInterval = null;
    }
}

async function fetchMessages(otherId) {
    const chatContainer = document.getElementById('chat-messages');
    try {
        const res = await fetch(`${API_BASE_URL}/messages/${currentUser.id}/${otherId}`);
        const messages = await res.json();
        chatContainer.innerHTML = ''; 
        messages.forEach(msg => {
            const isMine = msg.sender_id == currentUser.id;
            const bubble = document.createElement('div');
            bubble.className = `msg-bubble ${isMine ? 'msg-sent' : 'msg-received'}`;
            bubble.innerText = msg.content;
            chatContainer.appendChild(bubble);
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch(e) { console.error("Mesajlar yüklenemedi", e); }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if(!text || !currentChatUserId) return;
    try {
        const res = await fetch(`${API_BASE_URL}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senderId: currentUser.id, receiverId: currentChatUserId, content: text }) });
        const data = await res.json();
        if(data.success) { fetchMessages(currentChatUserId); input.value = ''; }
    } catch(e) { console.error(e); }
}

// Switch Chat Tabs
function switchChatTab(tab) {
    currentChatTab = tab;
    document.getElementById('chat-tab-mating').classList.remove('active');
    document.getElementById('chat-tab-adoption').classList.remove('active');
    document.getElementById(`chat-tab-${tab}`).classList.add('active');
    
    if(tab === 'adoption') {
        document.getElementById('chat-tab-adoption').classList.add('active-blue');
    } else {
        document.getElementById('chat-tab-mating').classList.add('active'); 
    }
    
    renderConversations();
}

async function renderConversations() {
    const container = document.getElementById('messages-list');
    try {
        const res = await fetch(`${API_BASE_URL}/conversations/${currentUser.id}`);
        const convs = await res.json();
        
        // FİLTRELEME: Seçili sekmeye (mating veya adoption) göre sohbetleri ayırır
        const filteredConvs = convs.filter(c => (c.goal || 'mating') === currentChatTab);

        if(filteredConvs.length === 0) {
            container.innerHTML = `<div class="flex flex-col items-center justify-center mt-12 text-gray-400 opacity-60"><i class="fas fa-inbox text-5xl mb-4"></i><p class="text-sm font-bold">Bu kategoride henüz mesajın yok.</p></div>`;
            return;
        }

        container.innerHTML = filteredConvs.map(c => {
            const goal = c.goal || 'mating';
            let badge = '';
            let borderColor = 'border-gray-200';
            let iconClass = 'fa-heart';
            let iconBg = 'bg-primary';
            
            if (goal === 'mating') {
                badge = '<span class="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-bold ml-2">Eşleşme</span>';
                borderColor = 'border-pink-200 dark:border-pink-900';
                iconClass = 'fa-heart';
                iconBg = 'bg-primary';
            } else if (goal === 'adoption') {
                badge = '<span class="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold ml-2">Sahiplenme</span>';
                borderColor = 'border-blue-200 dark:border-blue-900';
                iconClass = 'fa-home';
                iconBg = 'bg-secondary';
            }

            let imgUrl = fixMediaUrl(c.image) || 'https://placehold.co/150';

            return `
            <div onclick="openChatScreen(${c.otherUserId}, '${c.userName} (${c.petName})', '${imgUrl}', ${c.petId}, ${c.petOwnerId}, '${goal}')" 
                    class="flex items-center gap-4 p-3 rounded-2xl bg-white dark:bg-gray-800 border ${borderColor} hover:shadow-md transition cursor-pointer mb-2 group">
                
                <div class="relative">
                    <img src="${imgUrl}" class="w-14 h-14 rounded-full object-cover shadow-sm">
                    <div class="absolute -bottom-1 -right-1 w-5 h-5 ${iconBg} rounded-full flex items-center justify-center text-white text-[10px] shadow-sm">
                        <i class="fas ${iconClass}"></i>
                    </div>
                </div>
                
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-baseline mb-1">
                        <h4 class="font-bold text-dark dark:text-white text-sm truncate pr-2">
                            ${c.petName} 
                            <span class="text-gray-400 text-xs font-normal">(${c.userName})</span>
                        </h4>
                        <span class="text-[10px] text-gray-400 font-bold shrink-0">${c.time}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">${c.lastMessage}</p>
                        ${badge}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch(e) { console.error("Sohbet listesi hatası:", e); }
}
// --- RENDERERS ---
function renderCards() {
    const stack = document.getElementById('card-stack-inner');
    stack.innerHTML = '';
    currentPets.forEach((pet, index) => {
        const card = document.createElement('div');
        card.className = 'tinder-card';
const imgUrl = fixMediaUrl(pet.image_path || pet.image) || 'https://placehold.co/400x300?text=Resim+Yok';        card.style.backgroundImage = `url(${imgUrl})`;
        card.style.zIndex = index;
        card.innerHTML = `<div class="card-gradient absolute bottom-0 left-0 w-full h-full pointer-events-none"></div><div class="absolute bottom-6 left-6 text-white pointer-events-none"><h2 class="text-4xl font-extrabold shadow-black drop-shadow-md">${pet.name}, ${pet.age}</h2><p class="text-sm opacity-80 mt-1"><i class="fas fa-map-marker-alt mr-2"></i> ${pet.location || 'Konum Yok'}</p></div>`;
        stack.appendChild(card);
        if (index === currentPets.length - 1) initSwipeLogic(card);
    });
}

// --- DÜZENLENMİŞ SOHBET AÇMA FONKSİYONU ---
function renderAdoptionFeed() {
    const grid = document.getElementById('adoption-grid');
    
    grid.innerHTML = currentPets.map(pet => {
        let mediaHtml = '';
        
        // 1. VİDEO KONTROLÜ (fixMediaUrl eklendi)
        let rawVideo = pet.video_path || pet.video;
        const hasVideo = fixMediaUrl(rawVideo);
        
        if (hasVideo) {
            let vidSrc = hasVideo;
            
            // Akıllı Yönlendirme (Mini Kartlar İçin)
            if (vidSrc.includes('/uploads/') && !vidSrc.includes('/uploads/videos/')) {
                vidSrc = vidSrc.replace('/uploads/', '/uploads/videos/');
            } 
            else if (vidSrc.startsWith('uploads/') && !vidSrc.includes('videos/')) {
                vidSrc = vidSrc.replace('uploads/', `${SERVER_URL}/uploads/videos/`);
            } 
            else if (!vidSrc.startsWith('http')) {
                if (!vidSrc.includes('/')) {
                    vidSrc = `${SERVER_URL}/uploads/videos/${vidSrc}`;
                } else {
                    vidSrc = `${SERVER_URL}/${vidSrc}`;
                }
            }

            // Mini kartlarda video muted, autoplay, loop ve playsinline
            // thumbnail_w-20 eklendi, video küçük bir kutu olacak
            mediaHtml = `
                <video src="${vidSrc}" autoplay muted loop playsinline class="w-full h-full object-cover bg-gray-200"></video>
                <div class="absolute top-1 right-1 bg-black/40 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-sm z-10">
                    <i class="fas fa-video text-[9px]"></i>
                </div>
            `;
        } else {
            // 2. RESİM KONTROLÜ (fixMediaUrl eklendi)
            // thumbnail_w-20 eklendi, resim küçük bir kutu olacak
            let rawImage = pet.image_path || pet.image;
            const imgUrl = fixMediaUrl(rawImage) || 'https://placehold.co/400x300?text=Resim+Yok';
            mediaHtml = `<img src="${imgUrl}" class="w-full h-full object-cover">`;
        }

        // Barınak Rozeti Kontrolü (Daha küçük yapıldı)
        const shelterBadge = pet.is_shelter ? `
            <div class="absolute top-1 left-1 bg-purple-500/90 backdrop-blur-sm text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-10 flex items-center gap-1 border border-purple-400/50">
                <i class="fas fa-home text-[9px]"></i> B
            </div>
        ` : '';

        // İlan sahibinin adını veya Barınak adını gösterme (Daha küçük yapıldı)
        const ownerDisplay = pet.is_shelter ? `<span class="text-purple-500 text-[11px]"><i class="fas fa-home text-[10px]"></i> ${pet.ownerName}</span>` : `<i class="fas fa-user text-[10px]"></i> ${pet.ownerName}`;

        // --- YENİ YATAY LİSTE KARTI (Tam Genişlik) ---
        return `
            <div onclick="openPetDetail(${pet.id})" class="adoption-card flex items-center bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm cursor-pointer hover:shadow-md transition gap-4 border border-gray-100 dark:border-gray-700 w-full mb-3">
                
                <div class="w-20 h-20 rounded-xl bg-gray-200 overflow-hidden relative shrink-0">
                    ${shelterBadge} 
                    ${mediaHtml}
                </div>
                
                <div class="flex-1 min-w-0 pr-1 flex flex-col justify-between h-full py-1">
                    <div>
                        <h3 class="font-bold text-lg text-dark dark:text-white truncate leading-snug">${pet.name}</h3>
                        <p class="text-sm text-gray-400 truncate">${pet.breed || ''}</p>
                    </div>
                    
                    <div class="flex justify-between items-center mt-2.5">
                        <p class="text-xs text-gray-500 font-medium truncate flex items-center gap-1.5 leadin-none">${ownerDisplay}</p>
                        <i class="fas fa-chevron-right text-gray-300 text-sm ml-2"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
function renderFavorites() {
    const container = document.getElementById('favorites-grid');
    const emptyState = document.getElementById('no-favorites');
    if (mockFavorites.length === 0) { container.innerHTML = ''; emptyState.classList.remove('hidden'); emptyState.classList.add('flex'); return; }
    emptyState.classList.add('hidden'); emptyState.classList.remove('flex');
    container.innerHTML = mockFavorites.map(pet => `<div class="adoption-card bg-white dark:bg-gray-800 rounded-3xl p-2 shadow-soft"><div class="h-32 rounded-2xl bg-gray-200 overflow-hidden relative"><img src="${pet.image || getPlaceholderImage(400)}" class="w-full h-full object-cover"><div class="absolute top-2 right-2 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm"><i class="fas fa-star text-xs"></i></div></div><div class="px-2 py-3"><h3 class="font-bold text-dark dark:text-white">${pet.name}</h3><p class="text-xs text-gray-400">${pet.breed}</p></div></div>`).join('');
}

// --- INTERACTION ---
function openPetDetail(id) {
    let pet = currentPets.find(p => p.id === id);
    if (!pet) pet = historyPetsList.find(p => p.id === id);
    if(!pet) return;
    
    currentSelectedPet = pet;
    
    // HTML Elementleri
    const imgEl = document.getElementById('modal-img');
    const videoEl = document.getElementById('modal-video');
    const videoContainer = document.getElementById('modal-video-container');
    
    // Sesi veya oynatmayı sıfırla
    videoEl.pause();
    
    // Üst resmi ayarla
imgEl.src = fixMediaUrl(pet.image_path || pet.image) || 'https://placehold.co/400x600?text=Resim+Yok';    
    // Video kontrolü (Backend'den video veya video_path gelebilir)
    const hasVideo = pet.video_path || pet.video;
    
    if (hasVideo) {
        videoContainer.classList.remove('hidden');
        
        let finalVideoUrl = hasVideo;

        // VİDEO YOLUNU ZORLA DÜZELTME MANTIĞI:
        // Eğer linkte 'videos' klasörü eksikse, araya /videos/ ekliyoruz
        if (finalVideoUrl.includes('/uploads/') && !finalVideoUrl.includes('/uploads/videos/')) {
            finalVideoUrl = finalVideoUrl.replace('/uploads/', '/uploads/videos/');
        } 
        else if (finalVideoUrl.startsWith('uploads/') && !finalVideoUrl.includes('videos/')) {
            finalVideoUrl = finalVideoUrl.replace('uploads/', `${SERVER_URL}/uploads/videos/`);
        }
        else if (!finalVideoUrl.startsWith('http')) {
            // Sadece dosya adıysa veya formattan tamamen sapmışsa
            if (!finalVideoUrl.includes('/')) {
                finalVideoUrl = `${SERVER_URL}/uploads/videos/${finalVideoUrl}`;
            } else {
                finalVideoUrl = `${SERVER_URL}/${finalVideoUrl}`;
            }
        }

        // Videoyu oynatıcıya ver
        videoEl.src = finalVideoUrl;
        
        // Modal içindeki video için kontrolleri açıyoruz
        videoEl.controls = true; 
        videoEl.load();
     } else {
        // Videosu yoksa kutuyu tamamen gizle
        videoContainer.classList.add('hidden');
        videoEl.src = '';
    }

    // Metin verilerini doldur
    document.getElementById('modal-name').innerText = pet.name;
    document.getElementById('modal-breed').innerText = pet.breed_name || pet.breed;
    document.getElementById('modal-gender').innerText = pet.gender;
    document.getElementById('modal-age').innerText = `${pet.age} Yaş`;
    document.getElementById('modal-vaccine').innerText = pet.vaccinated ? "Aşılı" : "Aşısız";
    document.getElementById('modal-desc').innerText = pet.description || "Açıklama yok.";
    document.getElementById('modal-loc').innerText = pet.location || "Konum belirtilmedi.";
    
    // Modalı aç
    document.getElementById('pet-detail-modal').classList.add('open');
}   
// --- SWIPE LOGIC ---
function initSwipeLogic(card) {
    let startX = 0, startY = 0, isDragging = false;
    const start = (x, y) => { isDragging = true; startX = x; startY = y; card.style.transition = 'none'; };
    const move = (x, y) => { if(!isDragging) return; let deltaX = x - startX; let deltaY = y - startY; if(deltaY < -50 && Math.abs(deltaX) < 50) card.style.transform = `translateY(${deltaY}px)`; else card.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.05}deg)`; };
    const end = (x, y) => { isDragging = false; let deltaX = x - startX; let deltaY = y - startY; card.classList.add('animate-card'); if(deltaX > 100) swipe('right'); else if(deltaX < -100) swipe('left'); else if(deltaY < -100 && Math.abs(deltaX) < 100) swipe('super'); else card.style.transform = ''; };
    card.onmousedown = e => start(e.clientX, e.clientY); document.onmousemove = e => move(e.clientX, e.clientY); document.onmouseup = e => { if(isDragging) end(e.clientX, e.clientY); };
    card.ontouchstart = e => start(e.touches[0].clientX, e.touches[0].clientY); document.ontouchmove = e => move(e.touches[0].clientX, e.touches[0].clientY); document.ontouchend = e => { if(isDragging) end(e.changedTouches[0].clientX, e.changedTouches[0].clientY); };
}

function swipe(dir) {
    // 1. YENİ EKLENEN KONTROL: Kullanıcının henüz bir hayvanı yoksa işlemi durdur!
    if (!myPetId) {
        alert("Beğeni yapabilmek veya favoriye ekleyebilmek için önce Profil sekmesinden bir dost/ilan eklemelisiniz! 🐾");
        
        // Eğer kullanıcı kartı eliyle/mouse ile sürükleyip bıraktıysa, kartı eski yerine geri koyar
        const resetCard = document.querySelector('#card-stack-inner .tinder-card:last-child');
        if (resetCard) {
            resetCard.style.transition = 'transform 0.3s ease';
            resetCard.style.transform = '';
        }
        return; // İşlemi burada keser, veritabanını hatadan kurtarır
    }

    // 2. Orijinal kaydırma kodları (Kullanıcının hayvanı varsa normal çalışır)
    const card = document.querySelector('#card-stack-inner .tinder-card:last-child');
    if(!card) return;
    
    card.style.transition = 'transform 0.5s';
    if(dir==='super') card.style.transform = `translateY(-1000px)`;
    else card.style.transform = `translateX(${dir === 'right' ? 1000 : -1000}px) rotate(${dir === 'right' ? 30 : -30}deg)`;
    
    setTimeout(() => {
        const pet = currentPets.pop();
        fetch(`${API_BASE_URL}/like`, { 
            method: 'POST', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify({ likerId: myPetId, likedId: pet.id, action: dir }) 
        }).then(res => res.json()).then(data => { 
            if (data.match) alert("✨ Eşleşme Yakaladın! ✨"); 
            else if (data.isSuper) { 
                mockFavorites.push(pet); 
                alert("⭐ Favoriye Eklendi! ⭐"); 
            } 
        });
        renderCards();
    }, 300);
}
function previewImage(input) { if (input.files && input.files[0]) { const reader = new FileReader(); reader.onload = function(e) { document.getElementById('pet-preview').src = e.target.result; document.getElementById('pet-preview').classList.remove('hidden'); document.getElementById('upload-placeholder').classList.add('hidden'); }; reader.readAsDataURL(input.files[0]); } }
function hideAddPetForm() { document.getElementById('screen-add-pet').classList.remove('active'); document.getElementById('screen-profile').classList.add('active'); }
function closePetDetail() { 
    const videoEl = document.getElementById('modal-video');
    if(videoEl) videoEl.pause();
    document.getElementById('pet-detail-modal').classList.remove('open'); 
}
function toggleDarkMode() { document.documentElement.classList.toggle('dark'); }

// --- ADMIN PANEL FONKSİYONLARI ---
function openAdminPanel() {
    document.getElementById('admin-modal').classList.add('open');
    fetchAdminUsers();
}

function closeAdminPanel() {
    document.getElementById('admin-modal').classList.remove('open');
}

async function fetchAdminUsers() {
    try {
        const res = await fetch(`${API_BASE_URL}/users`);
        const users = await res.json();
        const listContainer = document.getElementById('admin-users-list');
        
        if (users.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-400 text-sm mt-10">Sistemde henüz başka kullanıcı yok.</p>';
            return;
        }

        listContainer.innerHTML = users.map(u => `
            <div class="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-50 dark:border-gray-700">
                <div>
                    <h4 class="font-bold text-dark dark:text-white">${u.name} ${u.surname}</h4>
                    <p class="text-xs text-gray-500">${u.email}</p>
                    ${u.is_shelter ? '<span class="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold mt-1 inline-block"><i class="fas fa-home"></i> Barınak</span>' : ''}
                </div>
                <label class="switch">
                    <input type="checkbox" ${u.is_shelter ? 'checked' : ''} onchange="toggleShelterStatus(${u.id}, this.checked)">
                    <span class="slider"></span>
                </label>
            </div>
        `).join('');
    } catch(e) { console.error("Kullanıcılar getirilemedi", e); }
}

async function toggleShelterStatus(userId, isShelter) {
    try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}/shelter`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isShelter })
        });
        const data = await res.json();
        if (data.success) {
            // Değişikliği anında ekranda yansıtmak için listeyi yenile
            fetchAdminUsers(); 
        }
    } catch(e) { console.error("Yetki güncellenemedi", e); }
}

function createFloatingPaws() {
    // Tüm olası konteynerleri yakala
    const containers = [
        document.getElementById('paw-animations-container-login'),
        document.getElementById('paw-animations-container-register'),
        document.getElementById('paw-animations-container') // Mod seçim ekranı
    ];

    containers.forEach(container => {
        if (!container) return;
        
        // Eğer zaten çalışıyorsa temizle (üst üste binmesin)
        if (container.dataset.intervalId) clearInterval(container.dataset.intervalId);

        const intervalId = setInterval(() => {
            // Sadece konteyner görünürse pati oluştur (performans için)
            if (container.offsetParent === null) return; 

            const paw = document.createElement('i');
            paw.className = 'fas fa-paw floating-paw';
            
            const left = Math.random() * 100;
            const duration = 10 + Math.random() * 5; // Biraz daha yavaş süzülsün
            const size = 15 + Math.random() * 20;

            paw.style.left = `${left}%`;
            paw.style.animationDuration = `${duration}s`;
            paw.style.fontSize = `${size}px`;
            // Opaklığı biraz artırdım ki net görünsün
            paw.style.opacity = 0.2 + Math.random() * 0.2; 
            
            container.appendChild(paw);
            setTimeout(() => paw.remove(), duration * 1000);
        }, 1500);

        container.dataset.intervalId = intervalId;
    });
}

// SAYFA YÜKLENDİĞİNDE ÇALIŞTIR
window.addEventListener('load', createFloatingPaws);