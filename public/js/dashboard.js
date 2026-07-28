let currentSelectedShift = 1;
let admissionsData = [];

async function initDashboard() {
    await fetchAdmissions();
    await fetchNotifications();
}

// 1. Fetch All Admissions from Secured API
async function fetchAdmissions() {
    const token = localStorage.getItem('library_token');
    try {
        const res = await fetch('/api/v1/admissions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            admissionsData = await res.json();
            renderSeatGrid();
        } else if (res.status === 401 || res.status === 403) {
            logout();
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

// 2. Render 25 Interactive Seats Grid
function renderSeatGrid() {
    const gridContainer = document.getElementById('seatGrid');
    gridContainer.innerHTML = '';

    // Filter admissions for current selected shift
    const shiftAdmissions = admissionsData.filter(a => a.shift === currentSelectedShift && a.status !== 'CANCELLED');
    const bookedMap = {};
    shiftAdmissions.forEach(a => bookedMap[a.seat_number] = a);

    let bookedCount = 0;

    for (let i = 1; i <= 25; i++) {
        const seatId = `S-${i}`;
        const student = bookedMap[seatId];

        let bgStyle = 'bg-emerald-500/10 border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400';
        let statusText = 'Available';
        let studentDetailHTML = `<span class="text-xs text-slate-500">Free Seat</span>`;

        if (student) {
            bookedCount++;
            if (student.status === 'EXPIRED') {
                bgStyle = 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20 text-amber-400';
                statusText = 'Expired';
            } else {
                bgStyle = 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20 text-red-400';
                statusText = 'Booked';
            }
            studentDetailHTML = `
                <div class="font-semibold text-slate-200 truncate">${student.full_name}</div>
                <div class="text-[10px] opacity-75">Exp: ${student.expiry_date}</div>
            `;
        }

        const seatCard = document.createElement('div');
        seatCard.className = `seat-card border p-3 rounded-xl flex flex-col justify-between h-24 ${bgStyle} cursor-pointer`;
        seatCard.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-sm">${seatId}</span>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-current">${statusText}</span>
            </div>
            <div class="mt-1">${studentDetailHTML}</div>
        `;

        if (student) {
            seatCard.onclick = () => window.open(`/api/v1/admissions/${student.id}/receipt`, '_blank');
        } else {
            seatCard.onclick = () => {
                document.getElementById('admSeat').value = seatId;
                openAdmissionModal();
            };
        }

        gridContainer.appendChild(seatCard);
    }

    document.getElementById('seatCountBadge').innerText = `${bookedCount}/25 Occupied (Shift ${currentSelectedShift})`;
}

// 3. Shift Filter Switcher
function changeShift(shiftNum) {
    currentSelectedShift = shiftNum;
    document.querySelectorAll('.shift-btn').forEach((btn, idx) => {
        if (idx + 1 === shiftNum) {
            btn.classList.add('bg-blue-600');
            btn.classList.remove('bg-slate-700');
        } else {
            btn.classList.remove('bg-blue-600');
            btn.classList.add('bg-slate-700');
        }
    });
    renderSeatGrid();
}

// 4. Fetch Expired Alerts
async function fetchNotifications() {
    const token = localStorage.getItem('library_token');
    try {
        const res = await fetch('/api/v1/notifications/expired', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        const tbody = document.getElementById('notificationsTableBody');
        tbody.innerHTML = '';

        if (!data.notifications || data.notifications.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500">Sabhi students active hain! Koi alert nahi hai.</td></tr>`;
            return;
        }

        data.notifications.forEach(s => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-800/80';
            row.innerHTML = `
                <td class="p-3 font-semibold text-white">${s.full_name}</td>
                <td class="p-3">${s.seat_number}</td>
                <td class="p-3">Shift ${s.shift}</td>
                <td class="p-3">${s.whatsapp_mobile}</td>
                <td class="p-3 text-amber-400 font-medium">${s.expiry_date}</td>
                <td class="p-3"><span class="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/30">${s.alert_type}</span></td>
                <td class="p-3"><a href="/api/v1/admissions/${s.id}/receipt" target="_blank" class="text-blue-400 hover:underline">View Receipt</a></td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Notification error:', err);
    }
}

// Modals Handlers
function openAdmissionModal() {
    document.getElementById('admissionModal').classList.remove('hidden');
    document.getElementById('admissionModal').classList.add('flex');
}
function closeAdmissionModal() {
    document.getElementById('admissionModal').classList.add('hidden');
    document.getElementById('admissionModal').classList.remove('flex');
}

// Submit New Admission Form
document.getElementById('admissionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('library_token');

    const bodyData = {
        full_name: document.getElementById('admFullName').value,
        whatsapp_mobile: document.getElementById('admMobile').value,
        email_id: document.getElementById('admEmail').value,
        study: document.getElementById('admStudy').value,
        address: document.getElementById('admAddress').value,
        shift: document.getElementById('admShift').value,
        seat_number: document.getElementById('admSeat').value || null,
        duration_months: document.getElementById('admMonths').value
    };

    try {
        const res = await fetch('/api/v1/admissions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });

        const data = await res.json();
        if (data.success) {
            alert(data.message);
            closeAdmissionModal();
            document.getElementById('admissionForm').reset();
            initDashboard();
        } else {
            alert(data.message || 'Error creating admission.');
        }
    } catch (err) {
        alert('Failed to process admission.');
    }
});