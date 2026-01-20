// ==========================================
// CONFIGURATION
// ==========================================
const BASE_API = 'https://herboo.store/wp-json/custom-api/v1'; 
const WP_API_ORDER = `${BASE_API}/place-order`;
const WP_API_SETTINGS = `${BASE_API}/settings`;
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfbEiJVZX1pJAzbqzGFjIfCdsuCvGWVpln0uA58L-oWwICBXQ/formResponse';

// Google Form IDs
const GF_IDS = { name: 'entry.2061024789', phone: 'entry.387310435', address: 'entry.1980931821' };

let SITE_SETTINGS = { phone: '01958488957', whatsapp: '01958488957', sale_price: '700', regular_price: '1200' };

// ==========================================
// 1. INIT & FETCH DATA
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
    AOS.init();

    // Fetch Settings
    try {
        const res = await fetch(WP_API_SETTINGS);
        const data = await res.json();
        if(data) { SITE_SETTINGS = data; updateDOM(data); }
    } catch (e) { console.error(e); updateDOM(SITE_SETTINGS); }

    // Check Lock
    checkOrderRestriction();
    
    // Start Popups
    setTimeout(startFakePopups, 7000);
});

function updateDOM(data) {
    const setHtml = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
    setHtml('dynamic_regular_price', data.regular_price);
    setHtml('dynamic_sale_price', data.sale_price);
    setHtml('dynamic_total_price', data.sale_price);
    setHtml('dynamic_btn_price', data.sale_price);

    const waLink = `https://wa.me/+88${data.whatsapp}`;
    const callLink = `tel:${data.phone}`;

    if(document.getElementById('float_whatsapp')) document.getElementById('float_whatsapp').href = waLink;
    if(document.getElementById('float_call')) document.getElementById('float_call').href = callLink;
    if(document.getElementById('dynamic_phone_display')) document.getElementById('dynamic_phone_display').innerText = data.phone;
    if(document.getElementById('dynamic_phone_link')) document.getElementById('dynamic_phone_link').href = callLink;



     // 3. NEW CONTACT SECTION (Add these lines)
    if(document.getElementById('section_call_number')) {
        document.getElementById('section_call_number').innerText = data.phone;
        document.getElementById('section_call_link').href = callLink;
    }
}

// ==========================================
// 2. 3-DAY RESTRICTION
// ==========================================
function checkOrderRestriction() {
    const lastOrderTime = localStorage.getItem('lastOrderTime');
    if (lastOrderTime) {
        const now = new Date().getTime();
        const diffDays = (now - parseInt(lastOrderTime)) / (1000 * 60 * 60 * 24);
        
        if (diffDays < 3) {
            const btn = document.getElementById('submit-btn');
            if(btn) {
                btn.innerHTML = `অর্ডার করতে কল করুন <br> <span class="text-xl">${SITE_SETTINGS.phone}</span>`;
                btn.classList.replace('bg-red-600', 'bg-blue-600');
                btn.classList.add('animate-pulse');
                btn.type = 'button';
                btn.onclick = () => window.location.href = `tel:${SITE_SETTINGS.phone}`;
            }
            // Optional: Show message
            const form = document.getElementById('checkoutForm');
            const msg = document.createElement('div');
            msg.className = "bg-white text-red-600 p-3 rounded mb-4 font-bold border border-red-300 text-center text-xl";
            msg.innerText = "আমরা আপনার একটি অর্ডার পেয়েছি , অর্ডার টি রেডি হচ্ছে ,আরেক বার অর্ডার করতে চাইলে কল করে অর্ডার করুন।  ধন্যবাদ।";
            form.prepend(msg);
        }
    }
}

// ==========================================
// 3. ORDER SUBMISSION
// ==========================================
document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if(document.getElementById('submit-btn').type === 'button') return;

    const btn = document.getElementById('submit-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'প্রসেসিং হচ্ছে...';

    // Data
    const name = document.getElementById('billing_name').value;
    const phone = document.getElementById('billing_phone').value;
    const address = document.getElementById('billing_address').value;
    const product_id = document.getElementById('product_id').value;

    // Tracking Cookies
    const getCookie = (n) => { let v = "; " + document.cookie; let p = v.split("; " + n + "="); if (p.length == 2) return p.pop().split(";").shift(); return ""; };
    const fbp = getCookie('_fbp'); const fbc = getCookie('_fbc');
    let ip = ''; try { const r = await fetch('https://api.ipify.org?format=json'); const d = await r.json(); ip = d.ip; } catch(e){}

    // 1. Google Form
    const gf = new FormData();
    gf.append(GF_IDS.name, name); gf.append(GF_IDS.phone, phone); gf.append(GF_IDS.address, address);
    fetch(GOOGLE_FORM_URL, { method: 'POST', mode: 'no-cors', body: gf }).catch(()=>{});

    // 2. WP API
    fetch(WP_API_ORDER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            product_id: product_id,
            billing: { first_name: name, phone: phone, address_1: address },
            fbp: fbp, fbc: fbc, user_agent: navigator.userAgent, ip_address: ip
        })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            // Lock Browser
            localStorage.setItem('lastOrderTime', new Date().getTime().toString());
            // Save Success Data
            localStorage.setItem('successOrderData', JSON.stringify({
                orderId: data.order_id, name, phone, address, 
                total: SITE_SETTINGS.sale_price, 
                supportPhone: SITE_SETTINGS.phone
            }));
            // Redirect
            window.location.href = 'thank-you.html';
        } else throw new Error();
    })
    .catch(() => {
        alert('অর্ডার রিসিভ হয়েছে। নেটওয়ার্ক সমস্যার কারণে কনফার্মেশন পেজে নেওয়া যাচ্ছে না।');
        window.location.reload();
    });
});
// --- NEW FUNCTION: SCROLL TO ORDER ---
// এই ফাংশনটি যোগ করা হয়েছে বাটন কাজ করানোর জন্য
function scrollToOrder() {
    const section = document.getElementById('order-sections');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}
// ==========================================
// 4. FAKE POPUPS
// ==========================================
const bdNames = [
    "আব্দুল করিম", "সুমন আহমেদ", "রহিম শেখ", "জামাল উদ্দিন", "আরিফ হোসেন", 
    "নাসির উদ্দিন", "কামাল হাসান", "রফিক মিয়া", "শফিক ইসলাম", "মমিনুল হক",
    "সাইফুল ইসলাম", "জুয়েল রানা", "ফারুক হোসেন", "মাসুম বিল্লাহ", "তানভীর আহমেদ",
    "রাসেল মিয়া", "সোহেল রানা", "ইমরান খান", "আশরাফুল আলম", "মাহবুবুর রহমান",
    "জহিরুল ইসলাম", "এনামুল হক", "রাকিব হাসান", "শাকিল আহমেদ", "বিপুল রায়",
    "ফয়সাল আহমেদ", "নাজমুল হুদা", "সাগর হোসেন", "লিটন দাস", "মুস্তাফিজুর রহমান",
    "আল আমিন", "মেহেদী হাসান", "তৌহিদুল ইসলাম", "শামীম রেজা", "বুলবুল আহমেদ",
    "রবিউল ইসলাম", "হাসান মাহমুদ", "ফিরোজ খান", "আতাউর রহমান", "মশিউর রহমান",
    "শাহিন আলম", "মিজানুর রহমান", "আনোয়ার হোসেন", "কবির হোসেন", "মাজেদ আলী",
    "সাইদুর রহমান", "হাবিবুর রহমান", "মোস্তফা কামাল", "জসিম উদ্দিন", "নুরুল ইসলাম",
    "ইসমাইল হোসেন", "আজিম উদ্দিন", "মোবারক আলী", "জাহাঙ্গীর আলম", "সজীব ওয়াজেদ"
];

// ৬৪টি জেলা এবং কিছু বড় শহর
const bdLocs = [
    "ঢাকা", "চট্টগ্রাম", "খুলনা", "রাজশাহী", "বরিশাল", "সিলেট", "রংপুর", "ময়মনসিংহ",
    "কুমিল্লা", "ফেনী", "ব্রাহ্মণবাড়িয়া", "রাঙ্গামাটি", "নোয়াখালী", "চাঁদপুর", "লক্ষ্মীপুর", 
    "কক্সবাজার", "খাগড়াছড়ি", "বান্দরবান", "সিরাজগঞ্জ", "পাবনা", "বগুড়া", "নাটোর", 
    "জয়পুরহাট", "চাপাইনবাবগঞ্জ", "নওগাঁ", "যশোর", "সাতক্ষীরা", "মেহেরপুর", "নড়াইল", 
    "চুয়াডাঙ্গা", "কুষ্টিয়া", "মাগুরা", "ঝিনাইদহ", "বাগেরহাট", "ঝালকাঠি", "পটুয়াখালী", 
    "পিরোজপুর", "ভোলা", "বরগুনা", "মৌলভীবাজার", "হবিগঞ্জ", "সুনামগঞ্জ", "নরসিংদী", 
    "গাজীপুর", "শরীয়তপুর", "নারায়ণগঞ্জ", "টাঙ্গাইল", "কিশোরগঞ্জ", "মানিকগঞ্জ", "মুন্সিগঞ্জ", 
    "রাজবাড়ী", "মাদারীপুর", "গোপালগঞ্জ", "ফরিদপুর", "পঞ্চগড়", "দিনাজপুর", "লালমনিরহাট", 
    "নীলফামারী", "গাইবান্ধা", "ঠাকুরগাঁও", "কুড়িগ্রাম", "শেরপুর", "জামালপুর", "নেত্রকোণা",
    "সাভার", "উত্তরা", "মিরপুর", "ধানমন্ডি", "গুলশান"
];

function startFakePopups() {
    setInterval(() => {
        const name = bdNames[Math.floor(Math.random() * bdNames.length)];
        const loc = bdLocs[Math.floor(Math.random() * bdLocs.length)];
        const time = Math.floor(Math.random() * 59) + 1;

        const div = document.createElement('div');
        div.className = 'custom-pop';
        div.innerHTML = `<img src="ginseng1.webp" class="pop-img"><div class="pop-content"><span class="highlight-time">${time} মিনিট আগে</span><h6>${name}</h6><p>${loc} থেকে অর্ডার করেছেন</p></div>`;
        document.body.appendChild(div);

        setTimeout(() => { div.style.animation = "fadeOut 0.5s forwards"; setTimeout(() => div.remove(), 500); }, 5000);
    }, 15000);
}