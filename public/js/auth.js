const API_BASE = '/api/v1';

// Form submit listener
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (data.success) {
            localStorage.setItem('library_token', data.token);
            checkAuth();
        } else {
            alert(data.message || 'Login failed!');
        }
    } catch (err) {
        alert('Server error. Check backend connection.');
    }
});

function checkAuth() {
    const token = localStorage.getItem('library_token');
    const loginModal = document.getElementById('loginModal');
    const dashboardApp = document.getElementById('dashboardApp');

    if (token) {
        loginModal.classList.add('hidden');
        dashboardApp.classList.remove('hidden');
        if (typeof initDashboard === 'function') initDashboard();
    } else {
        loginModal.classList.remove('hidden');
        dashboardApp.classList.add('hidden');
    }
}

function logout() {
    localStorage.removeItem('library_token');
    checkAuth();
}

// Initial authentication check
document.addEventListener('DOMContentLoaded', checkAuth);