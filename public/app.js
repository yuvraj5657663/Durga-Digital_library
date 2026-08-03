const API = "/api/v1"; // Relative path for API
let token = localStorage.getItem("token");

// In-Memory Database Array (syncs with SQLite)
let studentDirectory = [];
let inquiriesDirectory = [];

// Global Chart Instance for Financial Modal
let finChartInstance = null;

// ---------- Finance Amount Visibility Toggle ----------
let finAmountsVisible = true;
// Stores the last computed real values so toggle can restore them
const finAmountValues = {
  total: '₹0', shift1: '₹0', shift2: '₹0', shift3: '₹0', pending: '₹0'
};

function toggleFinAmounts() {
  finAmountsVisible = !finAmountsVisible;
  const eyeBtn = document.getElementById("fin-eye-btn");

  const ids = [
    ["fin-total-revenue",  "total"],
    ["fin-shift1-revenue", "shift1"],
    ["fin-shift2-revenue", "shift2"],
    ["fin-shift3-revenue", "shift3"],
    ["fin-pending-due",    "pending"]
  ];

  ids.forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerText = finAmountsVisible ? finAmountValues[key] : "₹ ••••••";
  });

  if (eyeBtn) eyeBtn.innerText = finAmountsVisible ? "👁" : "🙈";
}

// Module-level config loaded from server (populated by loadAppConfig on login)
let appConfig = { inquiryLink: '', upiId: '' };

// Load safe public config values (INQUIRY_LINK, UPI_ID) from the server
async function loadAppConfig() {
  try {
    const res  = await fetch(`${API}/config`);
    const data = await res.json();
    if (data.success) {
      appConfig.inquiryLink = data.inquiryLink || '';
      appConfig.upiId       = data.upiId       || '';
    }
  } catch (err) {
    console.error('Failed to load app config:', err);
  }
}
// Base monthly prices for 3 shifts
const SHIFT_DEFAULTS = {
  1: { hours: "6 AM - 12 PM (6 Hours)", baseFee: 400 },
  2: { hours: "12 PM - 6 PM (6 Hours)", baseFee: 500 },
  3: { hours: "6 PM - 12 AM (6 Hours)", baseFee: 600 }
};

// Inline SVGs
const ICONS = {
  chair: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  tv: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
};

// Convert seat number (1 to 24) to formatted code DDL001 - DDL024
function formatSeatCode(num) {
  return `DDL${String(num).padStart(3, '0')}`;
}

// Generate random seat code between DDL001 and DDL024
function generateRandomSeatCode() {
  const randNum = Math.floor(Math.random() * 24) + 1;
  return formatSeatCode(randNum);
}

// Decide seat status
function seatStatus(seatData) {
  if (!seatData || !seatData.is_booked) return "vacant";
  if (seatData.expiry_date) {
    const days = Math.ceil((new Date(seatData.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    if (days <= 5 && days >= 0) return "expiring";
  }
  return "booked";
}

function seatIcon(status) {
  if (status === "vacant") return ICONS.chair;
  if (status === "expiring") return ICONS.clock;
  return ICONS.book;
}

if (token) showDashboard();

// ---------- Login Logic ----------
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("login-error");
  const btn = e.target.querySelector(".btn-primary");
  if (btn) { btn.disabled = true; btn.style.opacity = "0.7"; btn.innerHTML = "Signing in…"; }
  try {
    const res = await fetch(`${API}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("login-username").value,
        password: document.getElementById("login-password").value
      })
    });
    const data = await res.json();
    if (data.token) {
      token = data.token;
      localStorage.setItem("token", token);
      showDashboard();
    } else {
      errEl.innerText = data.message || "Invalid Credentials";
    }
  } catch (err) {
    errEl.innerText = "Server Unreachable";
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = ""; btn.innerHTML = "Sign In"; }
  }
});

// ---------- Logout Logic ----------
document.getElementById("logout-btn")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  location.reload();
});

function showDashboard() {
  document.getElementById("login-screen")?.classList.remove("active");
  document.getElementById("dashboard-screen")?.classList.add("active");

  if (document.getElementById("adm-joining")) {
    document.getElementById("adm-joining").valueAsDate = new Date();
  }
  calculateExpiryAndFee();
  loadSeatMatrix();
  loadStudentDirectory(); 
  loadInquiriesDirectory(); // Load inquiries from Google Forms
  loadOnlineAdmissions();   // Load pending online admissions
  loadAppConfig();          // Load public server config (inquiry link, UPI id)
}

// ---------- Sidebar Controls ----------
const sidebarEl = document.getElementById("sidebar");
const overlayEl = document.getElementById("sidebar-overlay");
const menuToggleEl = document.getElementById("menu-toggle");

function closeSidebar() {
  sidebarEl?.classList.remove("open");
  overlayEl?.classList.remove("visible");
}
menuToggleEl?.addEventListener("click", () => {
  sidebarEl?.classList.contains("open") ? closeSidebar() : (sidebarEl?.classList.add("open"), overlayEl?.classList.add("visible"));
});
overlayEl?.addEventListener("click", closeSidebar);

// ---------- Navigation Tabs ----------
document.querySelectorAll(".nav-link").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    
    btn.classList.add("active");
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add("active");

    if (btn.dataset.tab === "seats-tab") loadSeatMatrix();
    if (btn.dataset.tab === "students-tab") loadStudentDirectory();
    if (btn.dataset.tab === "inquiries-tab") loadInquiriesDirectory();
    if (btn.dataset.tab === "alerts-tab") loadAlerts();
    if (btn.dataset.tab === "online-admissions-tab") loadOnlineAdmissions();

    // Auto generate random seat code if clicking New Admission directly
    if (btn.dataset.tab === "admission-tab") {
      const seatInput = document.getElementById("adm-seat");
      if (seatInput && !seatInput.value) {
        seatInput.value = generateRandomSeatCode();
      }
      calculateExpiryAndFee();
    }

    closeSidebar();
  });
});

// ---------- Auto Expiry & Fee Calculation ----------
function calculateExpiryAndFee() {
  const shiftVal = document.getElementById("adm-shift")?.value || "1";
  const duration = parseInt(document.getElementById("adm-duration")?.value || 1);
  const joiningDateVal = document.getElementById("adm-joining")?.value;

  if (joiningDateVal) {
    const joining = new Date(joiningDateVal);
    joining.setMonth(joining.getMonth() + duration);
    document.getElementById("adm-expiry").value = joining.toISOString().slice(0, 10);
  }

  const defaultData = SHIFT_DEFAULTS[shiftVal];
  if (defaultData) {
    const hoursInput = document.getElementById("adm-shift-hours");
    const feeInput = document.getElementById("adm-fee");
    if (hoursInput && !hoursInput.value) hoursInput.value = defaultData.hours;
    if (feeInput) feeInput.value = defaultData.baseFee * duration;
  }
}

document.getElementById("adm-shift")?.addEventListener("change", () => {
  const shiftVal = document.getElementById("adm-shift")?.value || "1";
  if (SHIFT_DEFAULTS[shiftVal]) {
    document.getElementById("adm-shift-hours").value = SHIFT_DEFAULTS[shiftVal].hours;
  }
  calculateExpiryAndFee();
});
document.getElementById("adm-duration")?.addEventListener("change", calculateExpiryAndFee);
document.getElementById("adm-joining")?.addEventListener("change", calculateExpiryAndFee);

// ---------- Dynamic Seat Grid Renderer ----------
async function loadSeatMatrix() {
  const shift = document.getElementById("shift-selector")?.value || 1;
  try {
    const res = await fetch(`${API}/seats?shift=${shift}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const container = document.getElementById("seat-grid");

    if (!container) return;

    container.className = "patna-conference-layout";
    container.innerHTML = `
      <div class="reception-board">${ICONS.tv} MAIN SCREEN / RECEPTION BOARD</div>
      <div class="seat-ring">
        <div class="seat-row" id="row-top"></div>
        <div class="seat-ring-middle">
          <div class="seat-col" id="col-left"></div>
          <div class="central-red-table">
            <div class="library-decor">
              <span class="plant-icon">🪴</span>
              <div>
                <h1>DURGA DIGITAL</h1>
                <small>LIBRARY</small>
              </div>
              <span class="plant-icon">🪴</span>
            </div>
          </div>
          <div class="seat-col" id="col-right"></div>
        </div>
        <div class="seat-row" id="row-bottom"></div>
      </div>
    `;

    const rowTop = container.querySelector("#row-top");
    const rowBottom = container.querySelector("#row-bottom");
    const colLeft = container.querySelector("#col-left");
    const colRight = container.querySelector("#col-right");

    function buildSeat(i) {
      const seatCode = formatSeatCode(i);
      const seatData = (data.seats || []).find(s => s.seat_number === i || s.seat_code === seatCode) || { is_booked: false };
      const status = seatStatus(seatData);
      const box = document.createElement("div");
      box.className = `seat-box external-seat ${status}`;
      box.tabIndex = 0;
      box.innerHTML = `
        <span class="seat-ico">${seatIcon(status)}</span>
        ${seatCode}
        <div class="seat-tooltip">${seatData.is_booked ? (seatData.student_name || "Booked") : "Click to Book"}</div>
      `;
      box.addEventListener("click", () => handleSeatClick(i, seatData));
      return box;
    }

    for (let i = 1; i <= 8; i++) rowTop.appendChild(buildSeat(i));
    for (let i = 9; i <= 12; i++) colRight.appendChild(buildSeat(i));
    for (let i = 13; i <= 20; i++) rowBottom.appendChild(buildSeat(i));
    for (let i = 21; i <= 24; i++) colLeft.appendChild(buildSeat(i));

  } catch (e) {
    console.error("Failed to load seat matrix:", e);
  }
}

// ---------- Seat Click Action ----------
function handleSeatClick(seatNum, seatData) {
  const seatCode = formatSeatCode(seatNum);

  if (!seatData || !seatData.is_booked) {
    document.getElementById("adm-seat").value = seatCode;
    calculateExpiryAndFee();
    document.querySelector('[data-tab="admission-tab"]')?.click();
  } else {
    document.getElementById("modal-seat-title").innerText = `Seat ${seatCode} Details`;
    document.getElementById("modal-seat-body").innerHTML = `
      <div style="font-size:0.95rem; line-height:1.7;">
        <p><strong>Student Name:</strong> ${seatData.student_name || "Booked"}</p>
        <p><strong>Mobile:</strong> ${seatData.mobile || "N/A"}</p>
        <p><strong>Preparation:</strong> ${seatData.preparation || "N/A"}</p>
        <p><strong>Expiry Date:</strong> ${seatData.expiry_date || "N/A"}</p>
      </div>
    `;
    document.getElementById("seat-modal").style.display = "flex";
  }
}

// ---------- Fetch All Students from SQLite Database ----------
async function loadStudentDirectory() {
  try {
    const res = await fetch(`${API}/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.students) {
      studentDirectory = data.students; 
      renderStudentDirectory();
      updateFinancialCardsSummary(); // Update Top Financial Metrics
    }
  } catch (err) {
    console.error("Failed to load students from database:", err);
  }
}

// ---------- Fetch All Inquiries (Google Form Data) ----------
async function loadInquiriesDirectory() {
  try {
    const res = await fetch(`${API}/inquiries`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.inquiries) {
      inquiriesDirectory = data.inquiries;
      renderInquiriesDirectory();
    }
  } catch (err) {
    console.error("Failed to load inquiries:", err);
  }
}

// ---------- Interactive Financial Modal Logic ----------
function openFinancialAnalytics(type) {
  const modal = document.getElementById("fin-modal");
  const title = document.getElementById("modal-fin-title");
  if (!modal) return;

  modal.style.display = "flex";

  let labelText = "Collection Trend";
  if (type === 'total') {
    title.innerText = 'Total Revenue Analytics & Trends';
  } else if (type === 'shift1') {
    title.innerText = 'Shift 1 (Morning) Collection Trends';
    labelText = 'Shift 1 Revenue (₹)';
  } else if (type === 'shift2') {
    title.innerText = 'Shift 2 (Afternoon) Collection Trends';
    labelText = 'Shift 2 Revenue (₹)';
  } else if (type === 'shift3') {
    title.innerText = 'Shift 3 / Full Day Collection Trends';
    labelText = 'Shift 3 Revenue (₹)';
  } else {
    title.innerText = 'Upcoming Renewals & Pending Due';
    labelText = 'Pending Dues (₹)';
  }

  renderFinancialChart(labelText);
}

function closeFinancialAnalytics() {
  const modal = document.getElementById("fin-modal");
  if (modal) modal.style.display = "none";
}

function renderFinancialChart(chartLabel = "Daily Collection (₹)") {
  const canvas = document.getElementById("financialChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  
  if (finChartInstance) {
    finChartInstance.destroy(); // Clear old instance
  }

  // Chart Rendering using Chart.js Library
  if (typeof Chart !== "undefined") {
    finChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: chartLabel,
          data: [2500, 4800, 7200, 9500],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#1d4ed8',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

// ---------- Dynamic Calculation of Top Financial Cards ----------
function updateFinancialCardsSummary() {
  let totalRev = 0;
  let s1Rev = 0;
  let s2Rev = 0;
  let s3Rev = 0;
  let pendingDue = 0;

  const now = new Date();

  studentDirectory.forEach(s => {
    const fee = parseFloat(s.fee) || 0;
    totalRev += fee;

    const shiftStr = String(s.shift || '');
    if (shiftStr.includes('1')) s1Rev += fee;
    else if (shiftStr.includes('2')) s2Rev += fee;
    else if (shiftStr.includes('3')) s3Rev += fee;

    // Calc pending dues for seat expiring in next 5 days
    if (s.expiryDate) {
      const exp = new Date(s.expiryDate);
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 5 && diffDays >= 0) {
        pendingDue += fee;
      }
    }
  });

  // Store real values so toggle can restore them
  finAmountValues.total   = `₹${totalRev.toLocaleString('en-IN')}`;
  finAmountValues.shift1  = `₹${s1Rev.toLocaleString('en-IN')}`;
  finAmountValues.shift2  = `₹${s2Rev.toLocaleString('en-IN')}`;
  finAmountValues.shift3  = `₹${s3Rev.toLocaleString('en-IN')}`;
  finAmountValues.pending = `₹${pendingDue.toLocaleString('en-IN')}`;

  // Only update DOM text if amounts are currently visible
  if (finAmountsVisible) {
    if (document.getElementById("fin-total-revenue"))  document.getElementById("fin-total-revenue").innerText  = finAmountValues.total;
    if (document.getElementById("fin-shift1-revenue")) document.getElementById("fin-shift1-revenue").innerText = finAmountValues.shift1;
    if (document.getElementById("fin-shift2-revenue")) document.getElementById("fin-shift2-revenue").innerText = finAmountValues.shift2;
    if (document.getElementById("fin-shift3-revenue")) document.getElementById("fin-shift3-revenue").innerText = finAmountValues.shift3;
    if (document.getElementById("fin-pending-due"))    document.getElementById("fin-pending-due").innerText    = finAmountValues.pending;
  }
}

// ---------- Show UPI QR Payment Modal ----------
async function showUPIQrModal(amount, studentName, seatCode) {
  try {
    const res = await fetch(`${API}/payment/upi-link?amount=${amount}&name=${encodeURIComponent(studentName)}&seatCode=${seatCode}`);
    const data = await res.json();

    if (data.success) {
      const modalBody = `
        <div style="text-align: center; padding: 10px;">
          <h3 style="color: #1b365d; margin-bottom: 5px;">Scan to Pay ₹${amount}</h3>
          <p style="font-size: 0.85rem; color: #64748b;">Payee: <strong>Durga Digital Library</strong> (${data.upiId})</p>
          
          <div style="margin: 15px 0;">
            <img src="${data.qrCodeUrl}" alt="UPI QR Code" style="width: 200px; height: 200px; border: 2px solid #e2e8f0; border-radius: 8px; padding: 5px;" />
          </div>

          <a href="${data.upiDeepLink}" class="btn-primary" style="display: inline-block; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 5px;">
            📱 Pay via GPay / PhonePe / Paytm
          </a>
        </div>
      `;

      document.getElementById("modal-seat-title").innerText = `Payment QR - ${seatCode}`;
      document.getElementById("modal-seat-body").innerHTML = modalBody;
      document.getElementById("seat-modal").style.display = "flex";
    }
  } catch (err) {
    console.error("Failed to generate UPI QR:", err);
  }
}

// ---------- Admission Form Submission Handler (With Double-Submit Protection) ----------
let isSubmittingAdmission = false;

document.getElementById("admission-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();

  if (isSubmittingAdmission) return; // Prevent double submission
  isSubmittingAdmission = true;

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.btn-primary');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing Admission...";
  }

  const studentData = {
    seatCode: document.getElementById("adm-seat").value || generateRandomSeatCode(),
    name: document.getElementById("adm-name").value,
    email: document.getElementById("adm-email").value,
    mobile: document.getElementById("adm-mobile").value,
    preparation: document.getElementById("adm-prep").value,
    duration: `${document.getElementById("adm-duration").value} Month(s)`,
    joiningDate: document.getElementById("adm-joining").value,
    expiryDate: document.getElementById("adm-expiry").value,
    fee: document.getElementById("adm-fee").value,
    shift: `Shift ${document.getElementById("adm-shift").value}`,
    shiftHours: document.getElementById("adm-shift-hours").value
  };

  try {
    const res = await fetch(`${API}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(studentData)
    });

    const data = await res.json();

    if (data.success) {
      alert(`🎉 Admission confirmed for ${studentData.name} (${studentData.seatCode})!`);
      
      form.reset();
      await loadStudentDirectory();
      
      document.querySelector('[data-tab="students-tab"]')?.click();
    } else {
      alert(`❌ Error: ${data.error || "Failed to save student"}`);
    }
  } catch (err) {
    console.error("Backend error:", err);
    alert("❌ Server connection error!");
  } finally {
    isSubmittingAdmission = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Confirm & Save Admission";
    }
  }
});

// ---------- Render Student Directory Table ----------
function renderStudentDirectory() {
  const tbody = document.getElementById("student-table-body");
  if (!tbody) return;

  if (!studentDirectory || studentDirectory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:2rem; color:var(--text-faint);">No students registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = studentDirectory.map(s => `
    <tr>
      <td><strong style="color:var(--brass);">${s.seatCode || 'N/A'}</strong></td>
      <td><strong>${s.name || 'N/A'}</strong></td>
      <td>${s.mobile || 'N/A'}</td>
      <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.email || 'N/A'}</td>
      <td>
        <span style="display:inline-block; padding:3px 10px; font-size:0.75rem; font-weight:600; border-radius:12px; background:#e0e7ff; color:#3730a3; white-space:nowrap;">
          ${s.preparation || 'N/A'}
        </span>
      </td>
      <td>${s.shift || ''} (${s.shiftHours || ''})</td>
      <td><strong>₹${s.fee || 0}</strong></td>
      <td>${s.joiningDate || 'N/A'}</td>
      <td><strong style="color:var(--red-booked, #dc2626);">${s.expiryDate || 'N/A'}</strong></td>
      <td style="white-space:nowrap;">
        <button
          data-student-id="${s.id || s._id}"
          onclick="openEditStudentById(this.dataset.studentId)"
          style="padding:4px 12px; font-size:0.78rem; font-weight:600; border-radius:5px; border:1px solid #3b82f6; background:#eff6ff; color:#1d4ed8; cursor:pointer; margin-right:4px;">
          ✏️ Edit
        </button>
        <button
          data-student-id="${s.id || s._id}"
          data-student-name="${(s.name || '').replace(/"/g, '&quot;')}"
          onclick="deleteStudent(this.dataset.studentId, this.dataset.studentName)"
          style="padding:4px 12px; font-size:0.78rem; font-weight:600; border-radius:5px; border:1px solid #dc2626; background:#fff1f2; color:#dc2626; cursor:pointer;">
          🗑️ Delete
        </button>
      </td>
    </tr>
  `).join("");
}

// ---------- Render Google Form Inquiries Table ----------
function renderInquiriesDirectory() {
  const tbody = document.getElementById("inquiry-table-body");
  if (!tbody) return;

  if (!inquiriesDirectory || inquiriesDirectory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-faint);">No online inquiries received yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = inquiriesDirectory.map(i => `
    <tr>
      <td><strong>${i.name || 'N/A'}</strong></td>
      <td>${i.mobile || 'N/A'}</td>
      <td>${i.email || 'N/A'}</td>
      <td><span style="display:inline-block; padding:3px 10px; font-size:0.75rem; font-weight:600; border-radius:12px; background:#fef3c7; color:#92400e;">${i.preparation || 'N/A'}</span></td>
      <td>${i.preferred_shift || 'N/A'}</td>
      <td>${i.created_at ? new Date(i.created_at).toLocaleDateString('en-IN') : 'N/A'}</td>
    </tr>
  `).join("");
}

// ---------- Share Form Link Handler (WhatsApp Promo Link) ----------
document.getElementById("share-form-btn")?.addEventListener("click", () => {
  const formUrl = appConfig.inquiryLink || "https://forms.gle/HgSDtMLqnCZgreBe8";
  const shareMsg = `📚 *Durga Digital Library, Munger* 📚%0A📍 Near Shiv Mandir, NH-80, Kalarampur, Munger%0A📞 Contact: Saurav Kumar - 7424893960%0A%0A*Facilities Available:*%0A- 24/7 Open Library%0A- 🎥 24x7 CCTV Camera%0A- 🧼 Clean Washroom%0A- 💧 RO Mineral Water%0A- 🌐 High-Speed Wi-Fi%0A- ❄️ Fully A.C.%0A- ⚡ Power Backup%0A%0ASeat Booking / Admission Inquiry Form:%0A👉 ${encodeURIComponent(formUrl)}`;
  window.open(`https://api.whatsapp.com/send?text=${shareMsg}`, '_blank');
});

// ---------- Modal Event Listeners ----------
document.querySelector(".close-modal")?.addEventListener("click", () => {
  document.getElementById("seat-modal").style.display = "none";
});
document.getElementById("seat-modal")?.addEventListener("click", (e) => {
  if (e.target.id === "seat-modal") e.target.style.display = "none";
});

document.getElementById("wa-btn")?.addEventListener("click", () => {
  document.getElementById("wa-modal").style.display = "flex";
});
document.querySelector(".close-modal-wa")?.addEventListener("click", () => {
  document.getElementById("wa-modal").style.display = "none";
});
document.getElementById("wa-modal")?.addEventListener("click", (e) => {
  if (e.target.id === "wa-modal") e.target.style.display = "none";
});

document.getElementById("shift-selector")?.addEventListener("change", loadSeatMatrix);

// ---------- Alerts Renderer ----------
async function loadAlerts() {
  const list = document.getElementById("alerts-list");
  if (!list) return;
  try {
    const res = await fetch(`${API}/alerts`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const alerts = data.alerts || data || [];
    if (alerts.length === 0) {
      list.innerHTML = `<p style="text-align:center; color:var(--text-faint); padding:2rem;">No seats expiring within 5 days.</p>`;
      return;
    }
    list.innerHTML = alerts.map(a => `
      <div class="table-card" style="padding:1rem 1.2rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>${a.name ?? "Student"}</strong>
          <div style="color:var(--text-muted); font-size:0.85rem;">Seat ${a.seat_code || a.seat_number || "-"} · Expiring: ${a.expiry_date ?? "-"}</div>
        </div>
      </div>
    `).join("");
  } catch (e) {
    list.innerHTML = "";
  }
}

// =============================================================
// FEATURE 1 – EDIT STUDENT
// =============================================================

// Safe wrapper: look up the student object from the in-memory array by ID
// This avoids embedding raw JSON in onclick attributes (XSS vector)
function openEditStudentById(id) {
  const student = studentDirectory.find(s => (s.id || s._id) === id || String(s._id) === String(id));
  if (!student) { alert('Student record not found. Please refresh the page.'); return; }
  openEditStudentModal(student);
}

// Open Edit modal pre-filled with the student's current data
function openEditStudentModal(student) {
  document.getElementById("edit-student-id").value        = student.id;
  document.getElementById("edit-name").value              = student.name        || '';
  document.getElementById("edit-mobile").value            = student.mobile      || '';
  document.getElementById("edit-email").value             = student.email       || '';
  document.getElementById("edit-preparation").value       = student.preparation || '';
  document.getElementById("edit-shiftHours").value        = student.shiftHours  || '';
  document.getElementById("edit-fee").value               = student.fee         || '';
  document.getElementById("edit-seatCode").value          = student.seatCode    || '';
  document.getElementById("edit-joiningDate").value       = student.joiningDate || '';
  document.getElementById("edit-expiryDate").value        = student.expiryDate  || '';

  // Match the shift select option
  const shiftSelect = document.getElementById("edit-shift");
  const shiftVal = student.shift || 'Shift 1';
  for (let opt of shiftSelect.options) {
    if (opt.value === shiftVal) { opt.selected = true; break; }
  }

  document.getElementById("edit-student-modal").style.display = "flex";
}

function closeEditStudentModal() {
  document.getElementById("edit-student-modal").style.display = "none";
}

// Close modal on backdrop click
document.getElementById("edit-student-modal")?.addEventListener("click", (e) => {
  if (e.target.id === "edit-student-modal") closeEditStudentModal();
});

// Submit handler — calls PUT /api/v1/students/:id
document.getElementById("edit-student-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.innerText = "Saving…"; }

  const id = document.getElementById("edit-student-id").value;

  const payload = {
    name:        document.getElementById("edit-name").value,
    mobile:      document.getElementById("edit-mobile").value,
    email:       document.getElementById("edit-email").value,
    preparation: document.getElementById("edit-preparation").value,
    shift:       document.getElementById("edit-shift").value,
    shiftHours:  document.getElementById("edit-shiftHours").value,
    fee:         document.getElementById("edit-fee").value,
    seatCode:    document.getElementById("edit-seatCode").value,
    joiningDate: document.getElementById("edit-joiningDate").value,
    expiryDate:  document.getElementById("edit-expiryDate").value
  };

  try {
    const res = await fetch(`${API}/students/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      closeEditStudentModal();
      await loadStudentDirectory(); // Refresh directory
      await loadSeatMatrix();       // Refresh seat grid
      alert(`✅ Student "${payload.name}" updated successfully!`);
    } else {
      alert(`❌ Update failed: ${data.message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Edit student error:", err);
    alert("❌ Server connection error while updating student.");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "💾 Save Changes"; }
  }
});


// =============================================================
// FEATURE 1 – DELETE STUDENT
// =============================================================

async function deleteStudent(id, name) {
  if (!confirm(`⚠️ Are you sure you want to delete "${name}"?\n\nThis will:\n• Remove student from directory\n• Free their allocated seat\n• Archive the record\n\nThis action cannot be undone.`)) return;

  try {
    const res = await fetch(`${API}/students/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success) {
      await loadStudentDirectory(); // Refresh directory
      await loadSeatMatrix();       // Refresh seat grid — seat now freed
      alert(`✅ ${data.message}`);
    } else {
      alert(`❌ Delete failed: ${data.message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Delete student error:", err);
    alert("❌ Server connection error while deleting student.");
  }
}


// =============================================================
// FEATURE 2 – ONLINE ADMISSIONS
// =============================================================

// In-memory store for pending online admissions
let onlineAdmissions = [];

async function loadOnlineAdmissions() {
  try {
    const res = await fetch(`${API}/online-admissions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      onlineAdmissions = data.admissions || [];
      renderOnlineAdmissions();
    }
  } catch (err) {
    console.error("Failed to load online admissions:", err);
  }
}

function renderOnlineAdmissions() {
  const tbody = document.getElementById("online-admissions-table-body");
  if (!tbody) return;

  if (!onlineAdmissions || onlineAdmissions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:2rem; color:var(--text-faint);">No pending online admissions.</td></tr>`;
    return;
  }

  tbody.innerHTML = onlineAdmissions.map(a => `
    <tr>
      <td><strong>${a.name || 'N/A'}</strong></td>
      <td>${a.father_name || '—'}</td>
      <td>${a.mobile || 'N/A'}</td>
      <td style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a.email || 'N/A'}</td>
      <td>
        <span style="display:inline-block; padding:3px 10px; font-size:0.75rem; font-weight:600; border-radius:12px; background:#e0e7ff; color:#3730a3; white-space:nowrap;">
          ${a.preparation || 'N/A'}
        </span>
      </td>
      <td>${a.preferred_shift || 'N/A'}</td>
      <td>
        <span style="display:inline-block; padding:3px 10px; font-size:0.75rem; font-weight:600; border-radius:12px;
          background:${a.payment_status === 'Paid' ? '#dcfce7' : '#fff7ed'};
          color:${a.payment_status === 'Paid' ? '#15803d' : '#c2410c'};">
          ${a.payment_status || 'Pending'}
        </span>
      </td>
      <td>
        <span style="display:inline-block; padding:3px 10px; font-size:0.75rem; font-weight:600; border-radius:12px; background:#fef9c3; color:#854d0e;">
          ${a.admission_status || 'Pending'}
        </span>
      </td>
      <td>${a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : 'N/A'}</td>
      <td style="white-space:nowrap;">
        <button
          onclick="openAcceptModal(${a.id}, '${(a.name || '').replace(/'/g, "\\'")}', '${(a.mobile || '').replace(/'/g, "\\'")}')"
          style="padding:4px 11px; font-size:0.78rem; font-weight:600; border-radius:5px; border:1px solid #059669; background:#ecfdf5; color:#047857; cursor:pointer; margin-right:4px;">
          ✅ Accept
        </button>
        <button
          onclick="rejectOnlineAdmission(${a.id}, '${(a.name || '').replace(/'/g, "\\'")}')"
          style="padding:4px 11px; font-size:0.78rem; font-weight:600; border-radius:5px; border:1px solid #dc2626; background:#fff1f2; color:#dc2626; cursor:pointer;">
          ❌ Reject
        </button>
      </td>
    </tr>
  `).join("");
}


// =============================================================
// FEATURE 3 – ACCEPT ONLINE ADMISSION
// =============================================================

function openAcceptModal(id, name, mobile) {
  document.getElementById("accept-inquiry-id").value = id;
  document.getElementById("accept-name").value        = name;
  document.getElementById("accept-mobile").value      = mobile;

  // Default joining date to today
  document.getElementById("accept-joiningDate").valueAsDate = new Date();

  // Auto-calculate expiry (1 month default)
  const joining = new Date();
  joining.setMonth(joining.getMonth() + 1);
  document.getElementById("accept-expiryDate").value = joining.toISOString().slice(0, 10);

  // Auto-fill shift hours based on default shift selection
  const shiftVal = document.getElementById("accept-shift").value;
  const shiftNum = shiftVal ? parseInt(shiftVal.replace(/[^0-9]/g, '')) || 1 : 1;
  if (SHIFT_DEFAULTS[shiftNum]) {
    document.getElementById("accept-shiftHours").value = SHIFT_DEFAULTS[shiftNum].hours;
    document.getElementById("accept-fee").value         = SHIFT_DEFAULTS[shiftNum].baseFee;
  }

  document.getElementById("accept-admission-modal").style.display = "flex";
}

function closeAcceptModal() {
  document.getElementById("accept-admission-modal").style.display = "none";
}

// Close accept modal on backdrop click
document.getElementById("accept-admission-modal")?.addEventListener("click", (e) => {
  if (e.target.id === "accept-admission-modal") closeAcceptModal();
});

// Auto-update shift hours & fee when shift changes in accept modal
document.getElementById("accept-shift")?.addEventListener("change", () => {
  const shiftVal = document.getElementById("accept-shift").value;
  const shiftNum = parseInt(shiftVal.replace(/[^0-9]/g, '')) || 1;
  if (SHIFT_DEFAULTS[shiftNum]) {
    document.getElementById("accept-shiftHours").value = SHIFT_DEFAULTS[shiftNum].hours;
  }
});

// Auto-update expiry when duration changes in accept modal
document.getElementById("accept-duration")?.addEventListener("change", () => {
  const joiningVal = document.getElementById("accept-joiningDate").value;
  const durationStr = document.getElementById("accept-duration").value; // "1 Month(s)"
  const months = parseInt(durationStr) || 1;
  const shiftNum = parseInt((document.getElementById("accept-shift").value || '').replace(/[^0-9]/g, '')) || 1;

  if (joiningVal) {
    const exp = new Date(joiningVal);
    exp.setMonth(exp.getMonth() + months);
    document.getElementById("accept-expiryDate").value = exp.toISOString().slice(0, 10);
  }

  if (SHIFT_DEFAULTS[shiftNum]) {
    document.getElementById("accept-fee").value = SHIFT_DEFAULTS[shiftNum].baseFee * months;
  }
});

// Submit handler — reuses POST /api/v1/online-admissions/accept/:id
// which internally reuses the same student + seat + WhatsApp + Email + PDF logic
let isSubmittingAccept = false;

document.getElementById("accept-admission-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSubmittingAccept) return;
  isSubmittingAccept = true;

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.innerText = "Processing…"; }

  const id = document.getElementById("accept-inquiry-id").value;

  const payload = {
    seatCode:    document.getElementById("accept-seatCode").value,
    shift:       document.getElementById("accept-shift").value,
    shiftHours:  document.getElementById("accept-shiftHours").value,
    duration:    document.getElementById("accept-duration").value,
    fee:         document.getElementById("accept-fee").value,
    joiningDate: document.getElementById("accept-joiningDate").value,
    expiryDate:  document.getElementById("accept-expiryDate").value
  };

  try {
    const res = await fetch(`${API}/online-admissions/accept/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      closeAcceptModal();
      // Refresh all four views that are affected
      await loadOnlineAdmissions(); // Remove from pending list
      await loadStudentDirectory(); // Add to student directory
      await loadSeatMatrix();       // Mark seat as booked
      alert(`✅ ${data.message}`);
    } else {
      alert(`❌ Accept failed: ${data.message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Accept admission error:", err);
    alert("❌ Server connection error while accepting admission.");
  } finally {
    isSubmittingAccept = false;
    if (btn) { btn.disabled = false; btn.innerText = "✅ Confirm Admission"; }
  }
});


// =============================================================
// FEATURE 3 – REJECT ONLINE ADMISSION
// =============================================================

async function rejectOnlineAdmission(id, name) {
  if (!confirm(`Reject admission for "${name}"?\n\nNo seat will be allocated and no receipt will be sent.`)) return;

  try {
    const res = await fetch(`${API}/online-admissions/reject/${id}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success) {
      await loadOnlineAdmissions(); // Remove from pending list
      alert(`✅ ${data.message}`);
    } else {
      alert(`❌ Reject failed: ${data.message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Reject admission error:", err);
    alert("❌ Server connection error while rejecting admission.");
  }
}
