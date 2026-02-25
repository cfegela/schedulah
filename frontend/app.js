const API_BASE_URL = '/api';

// Authentication state
let authToken = null;
let isAuthenticated = false;

// State
let currentRental = null;

// Calendar state (for reservation calendar)
let calendarState = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDates: [],
    reservations: [],
    availableDates: [],
    rentalId: null
};

// Availability calendar state (for edit rental page)
let availabilityCalendarState = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    availableDates: [],
    reservedDates: [],
    rentalId: null
};

// Authentication helpers
function getAuthToken() {
    return localStorage.getItem('authToken');
}

function setAuthToken(token) {
    localStorage.setItem('authToken', token);
    authToken = token;
    isAuthenticated = true;
}

function clearAuthToken() {
    localStorage.removeItem('authToken');
    authToken = null;
    isAuthenticated = false;
}

function checkAuth() {
    const token = getAuthToken();
    if (token) {
        authToken = token;
        isAuthenticated = true;
    }
}

function logout() {
    clearAuthToken();
    navigateTo('/');
    updateNavbar();
}

function updateNavbar() {
    const reservationsLink = document.getElementById('reservations-link');
    const loginLink = document.getElementById('login-link');
    const logoutBtn = document.getElementById('logout-btn');

    if (reservationsLink) {
        reservationsLink.style.display = isAuthenticated ? 'block' : 'none';
    }

    if (loginLink) {
        loginLink.style.display = isAuthenticated ? 'none' : 'block';
    }

    if (logoutBtn) {
        logoutBtn.style.display = isAuthenticated ? 'block' : 'none';
    }
}

// Fetch wrapper that adds auth token
async function authenticatedFetch(url, options = {}) {
    const token = getAuthToken();
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }

    const response = await fetch(url, options);

    // Handle 401 Unauthorized
    if (response.status === 401) {
        clearAuthToken();
        navigateTo('/login');
        return response;
    }

    return response;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initNavbar();
    updateNavbar();
    initRouter();
});

// HTML5 History API router
function initRouter() {
    // Route handling function
    window.handleRoute = function() {
        const path = window.location.pathname;
        const viewContainer = document.getElementById('view-container');

        if (!viewContainer) return;

        // Show/hide navbar based on route
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.style.display = path === '/login' ? 'none' : 'block';
        }

        // Update active nav link
        updateActiveNavLink();

        // Route handling
        if (path === '/login') {
            renderLogin();
        } else if (path === '/' || path === '/rentals') {
            renderRentalsList();
        } else if (path === '/rentals/new') {
            if (!isAuthenticated) {
                navigateTo('/login');
                return;
            }
            renderRentalForm('create');
        } else if (path.startsWith('/rentals/edit/')) {
            if (!isAuthenticated) {
                navigateTo('/login');
                return;
            }
            const rentalId = path.split('/').pop();
            renderRentalForm('edit', rentalId);
        } else if (path.startsWith('/rentals/')) {
            const rentalId = path.split('/').pop();
            if (rentalId && rentalId !== 'new') {
                renderRentalView(rentalId);
            } else {
                renderRentalsList();
            }
        } else if (path === '/reservations') {
            if (!isAuthenticated) {
                navigateTo('/login');
                return;
            }
            renderReservations();
        } else if (path.startsWith('/reservations/new/')) {
            if (!isAuthenticated) {
                navigateTo('/login');
                return;
            }
            const parts = path.split('/');
            const rentalId = parts[3];
            const date = parts[4];
            if (rentalId && date) {
                renderCreateReservation(rentalId, date);
            } else {
                renderReservations();
            }
        } else if (path.startsWith('/reservations/edit/')) {
            if (!isAuthenticated) {
                navigateTo('/login');
                return;
            }
            const parts = path.split('/');
            const rentalId = parts[3];
            const date = parts[4];
            if (rentalId && date) {
                renderEditReservation(rentalId, date);
            } else {
                renderReservations();
            }
        } else if (path.startsWith('/reservations/')) {
            if (!isAuthenticated) {
                navigateTo('/login');
                return;
            }
            const parts = path.split('/');
            const rentalId = parts[2];
            const date = parts[3];
            if (rentalId && date && parts[2] !== 'edit' && parts[2] !== 'new') {
                renderViewReservation(rentalId, date);
            } else {
                renderReservations();
            }
        } else if (path === '/about') {
            renderAbout();
        } else if (path === '/faq') {
            renderFaq();
        } else {
            renderRentalsList();
        }
    };

    // Listen for popstate (browser back/forward buttons)
    window.addEventListener('popstate', handleRoute);

    // Global click interceptor for internal links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Only intercept internal links (starting with /)
        if (href.startsWith('/') && !href.startsWith('//')) {
            e.preventDefault();
            navigateTo(href);
        }
    });

    // Initial route
    handleRoute();
}

// Helper function for programmatic navigation
function navigateTo(path) {
    history.pushState(null, '', path);
    handleRoute();
}

function updateActiveNavLink() {
    const path = window.location.pathname;
    const links = document.querySelectorAll('.navbar-link');

    links.forEach(link => {
        const href = link.getAttribute('href');
        const isActive = href === path || (href === '/' && path === '/rentals');

        if (isActive) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Navbar functionality
function initNavbar() {
    const navbarToggle = document.getElementById('navbar-toggle');
    const navbarMenu = document.getElementById('navbar-menu');
    const navbarOverlay = document.getElementById('navbar-overlay');
    const navbarLinks = document.querySelectorAll('.navbar-link');

    if (!navbarToggle || !navbarMenu || !navbarOverlay) return;

    // Toggle menu
    navbarToggle.addEventListener('click', () => {
        navbarMenu.classList.toggle('active');
        navbarToggle.classList.toggle('active');
        navbarOverlay.classList.toggle('active');
    });

    // Close menu when clicking overlay
    navbarOverlay.addEventListener('click', () => {
        navbarMenu.classList.remove('active');
        navbarToggle.classList.remove('active');
        navbarOverlay.classList.remove('active');
    });

    // Close menu when clicking a link
    navbarLinks.forEach(link => {
        link.addEventListener('click', () => {
            navbarMenu.classList.remove('active');
            navbarToggle.classList.remove('active');
            navbarOverlay.classList.remove('active');
        });
    });
}

// Render Rentals List View
async function renderRentalsList() {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Rentals</h1>
            ${isAuthenticated ? '<a href="/rentals/new" class="btn btn-primary">Create New Rental</a>' : ''}
        </div>

        <div class="rentals-section">
            <div id="loading" class="loading">Loading rentals...</div>
            <div id="error" class="error" style="display: none;"></div>
            <div id="rentals-grid" class="rentals-grid" style="display: none;"></div>
            <div id="empty-state" style="display: none;" class="empty-state">
                <p>No rentals yet.${isAuthenticated ? ' Create one to get started!' : ''}</p>
                ${isAuthenticated ? '<a href="/rentals/new" class="btn btn-primary" style="margin-top: 1rem;">Create Your First Rental</a>' : ''}
            </div>
        </div>
    `;

    await loadRentals();
}

// Render Rental Form View (Create or Edit)
async function renderRentalForm(mode, rentalId = null) {
    const viewContainer = document.getElementById('view-container');
    const isEdit = mode === 'edit';

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">${isEdit ? 'Edit Rental' : 'Create New Rental'}</h1>
            <a href="/" class="btn btn-secondary">Back to Rentals</a>
        </div>

        <div class="form-section">
            <div id="form-error" class="error" style="display: none;"></div>
            <form id="rental-form">
                <input type="hidden" id="rental-id" value="${rentalId || ''}">
                <div class="form-group">
                    <label for="rental-name">Name *</label>
                    <input type="text" id="rental-name" required>
                </div>
                <div class="form-group">
                    <label for="rental-description">Description</label>
                    <textarea id="rental-description" rows="4"></textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary" id="submit-btn">
                        ${isEdit ? 'Update Rental' : 'Create Rental'}
                    </button>
                    <a href="/" class="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>

        ${isEdit ? `
        <div class="form-section" style="margin-top: 2rem;">
            <h2>Availability</h2>
            <div id="availability-summary" style="margin: 1.5rem 0;">
                <div style="color: var(--text-secondary);">Loading availability...</div>
            </div>
            <button type="button" class="btn btn-primary" onclick="openAvailabilityCalendarModal('${rentalId}')">Set Available Dates</button>
        </div>

        <!-- Availability Calendar Modal -->
        <div id="availability-calendar-modal" class="modal-overlay">
            <div class="modal-content">
                <div id="availability-calendar-container"></div>
            </div>
        </div>
        ` : ''}

        ${isEdit ? `
        <div class="form-section" style="margin-top: 2rem;">
            <h2 class="card-header" style="color: var(--danger); border-bottom: 2px solid var(--danger); padding-bottom: 0.5rem; margin-bottom: 1rem;">Danger Zone</h2>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
                These actions are irreversible and will permanently delete data from the system.
            </p>
            <div>
                <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">Delete Rental</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.875rem;">
                    Permanently delete this rental and all associated reservations. This action cannot be undone.
                </p>
                <button type="button" class="btn btn-delete" id="delete-rental-btn">
                    Delete Rental
                </button>
            </div>
        </div>
        ` : ''}
    `;

    // Load rental data if editing
    if (isEdit && rentalId) {
        await loadRentalForEdit(rentalId);
        await loadAvailabilitySummary(rentalId);
    }

    // Attach form submit handler
    const form = document.getElementById('rental-form');
    form.addEventListener('submit', handleFormSubmit);

    // Attach delete button handler if editing
    if (isEdit && rentalId) {
        const deleteBtn = document.getElementById('delete-rental-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteRentalFromEdit(rentalId));
        }
    }
}

// Render About Page
function renderAbout() {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">About Schedulah</h1>
            <a href="/" class="btn btn-secondary">Back to Rentals</a>
        </div>

        <div class="form-section">
            <h2>About This Application</h2>
            <p>Schedulah is a simple rentals CRUD application built as a demonstration of modern web development practices.</p>

            <h3 style="margin-top: 2rem;">Technology Stack</h3>
            <ul style="margin-left: 2rem; margin-top: 1rem;">
                <li><strong>Backend:</strong> Python Lambda handlers (AWS-deployable)</li>
                <li><strong>Frontend:</strong> Vanilla JavaScript (no frameworks)</li>
                <li><strong>Database:</strong> DynamoDB Local</li>
                <li><strong>Deployment:</strong> Docker Compose</li>
            </ul>

            <h3 style="margin-top: 2rem;">Features</h3>
            <ul style="margin-left: 2rem; margin-top: 1rem;">
                <li>Create, read, update, and delete rentals</li>
                <li>Responsive design for mobile and desktop</li>
                <li>Clean, modern user interface</li>
                <li>RESTful API architecture</li>
                <li>Local development environment with hot reload</li>
            </ul>

            <div style="margin-top: 2rem;">
                <a href="/" class="btn btn-primary">Get Started</a>
            </div>
        </div>
    `;
}

// Render FAQ Page
function renderFaq() {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Frequently Asked Questions</h1>
            <a href="/" class="btn btn-secondary">Back to Rentals</a>
        </div>

        <div class="form-section">
            <h2>General Questions</h2>

            <h3 style="margin-top: 2rem;">What is Schedulah?</h3>
            <p>Schedulah is a rental reservation system that allows you to manage rentals and their availability. You can create rentals, set which dates they're available, and make reservations for specific dates.</p>

            <h3 style="margin-top: 2rem;">How do I create a rental?</h3>
            <p>Click on "Rentals" in the navigation menu, then click the "Create New Rental" button. Fill in the rental name and description, then click "Create Rental".</p>

            <h3 style="margin-top: 2rem;">How do I set availability for a rental?</h3>
            <p>After creating a rental, click "Edit" from the rental list or rental details page. Scroll to the availability calendar and click on dates to toggle their availability. Green dates are available for reservations.</p>

            <h2 style="margin-top: 2.5rem;">Reservations</h2>

            <h3 style="margin-top: 2rem;">How do I make a reservation?</h3>
            <p>View a rental's details page and use the reservation calendar. Click on an available date (shown in green), enter who the reservation is for and any notes, then submit the form.</p>

            <h3 style="margin-top: 2rem;">Can I reserve multiple days at once?</h3>
            <p>No, each reservation is for a single day. You'll need to create separate reservations for each date.</p>

            <h3 style="margin-top: 2rem;">How do I view all reservations?</h3>
            <p>Click "Reservations" in the navigation menu to see a list of all reservations across all rentals.</p>

            <h3 style="margin-top: 2rem;">How do I edit or cancel a reservation?</h3>
            <p>From the reservations list, click "Details" to see the reservation details, then click "Edit". You can update the details or scroll to the Danger Zone to delete the reservation.</p>

            <h2 style="margin-top: 2.5rem;">Data & Storage</h2>

            <h3 style="margin-top: 2rem;">Is my data saved?</h3>
            <p>Yes, all data is persisted in a local DynamoDB database that survives container restarts.</p>

            <h3 style="margin-top: 2rem;">Can I export my data?</h3>
            <p>Currently, there's no built-in export feature. Data is stored locally in the DynamoDB container.</p>

            <div style="margin-top: 2rem;">
                <a href="/" class="btn btn-primary">Get Started</a>
            </div>
        </div>
    `;
}

// Render Login Page
function renderLogin() {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <h1 class="login-title">Schedulah</h1>
                    <p class="login-subtitle">Sign in to your account</p>
                </div>
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label" for="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            class="form-input"
                            required
                            autofocus
                            autocomplete="username"
                            placeholder="admin"
                        >
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            class="form-input"
                            required
                            autocomplete="current-password"
                            placeholder="••••••••"
                        >
                    </div>
                    <div id="login-error" class="form-error" style="display: none;"></div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    `;

    const form = document.getElementById('login-form');
    form.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();

    const form = e.target;
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!username || !password) {
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        setAuthToken(data.token);
        updateNavbar();
        navigateTo('/reservations');
    } catch (error) {
        // Display user-friendly error message
        let errorText = 'Login failed. Please try again.';

        if (error.message) {
            const msg = error.message.toLowerCase();
            if (msg.includes('invalid') || msg.includes('unauthorized')) {
                errorText = 'Invalid username or password. Please check your credentials and try again.';
            } else if (msg.includes('network') || msg.includes('fetch')) {
                errorText = 'Unable to connect to server. Please check your connection and try again.';
            } else {
                errorText = error.message;
            }
        }

        if (errorDiv) {
            errorDiv.textContent = errorText;
            errorDiv.style.display = 'block';
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
}

// Render Reservations List View
async function renderReservations() {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Reservations</h1>
        </div>

        <div class="rentals-section">
            <div id="loading" class="loading">Loading reservations...</div>
            <div id="error" class="error" style="display: none;"></div>
            <div id="reservations-grid" class="rentals-grid" style="display: none;"></div>
            <div id="empty-state" style="display: none;" class="empty-state">
                <p>No reservations yet.</p>
            </div>
        </div>
    `;

    await loadAllReservations();
}

// Load all reservations from all rentals
async function loadAllReservations() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const reservationsGrid = document.getElementById('reservations-grid');
    const emptyState = document.getElementById('empty-state');

    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';

        // First, get all rentals
        const rentalsResponse = await fetch(`${API_BASE_URL}/rentals`);
        if (!rentalsResponse.ok) {
            throw new Error('Failed to load rentals');
        }
        const rentals = await rentalsResponse.json();

        // Create a map of rentalId -> rentalName for lookup
        const rentalsMap = {};
        rentals.forEach(rental => {
            rentalsMap[rental.id] = rental.name;
        });

        // Then, get all reservations for each rental
        const allReservations = [];
        for (const rental of rentals) {
            const resResponse = await authenticatedFetch(`${API_BASE_URL}/rentals/${rental.id}/reservations`);
            if (resResponse.ok) {
                const reservations = await resResponse.json();
                reservations.forEach(res => {
                    allReservations.push({
                        ...res,
                        rentalName: rental.name
                    });
                });
            }
        }

        // Sort by date (most recent first)
        allReservations.sort((a, b) => b.date.localeCompare(a.date));

        if (loadingDiv) loadingDiv.style.display = 'none';

        if (allReservations.length === 0) {
            reservationsGrid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            displayReservations(allReservations);
            reservationsGrid.style.display = 'grid';
            emptyState.style.display = 'none';
        }

    } catch (error) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
}

// Display reservations in card grid
function displayReservations(reservations) {
    const reservationsGrid = document.getElementById('reservations-grid');
    if (!reservationsGrid) return;

    reservationsGrid.innerHTML = '';

    reservations.forEach(reservation => {
        const card = document.createElement('div');
        card.className = 'rental-card';
        card.style.cursor = 'default';
        card.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <h3 class="rental-card-name" style="margin-bottom: 0.75rem;">${formatDateDisplay(reservation.date)}</h3>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="color: var(--text-secondary); min-width: 80px;">Rental:</span>
                        <a href="/rentals/${reservation.rentalId}" class="rental-name-link" style="font-weight: 500;">
                            ${escapeHtml(reservation.rentalName)}
                        </a>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="color: var(--text-secondary); min-width: 80px;">Reserved by:</span>
                        <span style="font-weight: 500;">${escapeHtml(reservation.reservedBy)}</span>
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                <a href="/reservations/${reservation.rentalId}/${reservation.date}" class="btn btn-secondary" title="View details" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <img src="https://cdn.jsdelivr.net/npm/remixicon@4.8.0/icons/System/eye-fill.svg" alt="Details" style="width: 18px; height: 18px;">
                    <span>Details</span>
                </a>
                <a href="/reservations/edit/${reservation.rentalId}/${reservation.date}" class="btn btn-secondary" title="Edit reservation" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <img src="https://cdn.jsdelivr.net/npm/remixicon@4.8.0/icons/Design/pencil-ai-fill.svg" alt="Edit" style="width: 18px; height: 18px;">
                    <span>Edit</span>
                </a>
            </div>
        `;
        reservationsGrid.appendChild(card);
    });
}

// Render Create Reservation Page
async function renderCreateReservation(rentalId, date) {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Create Reservation</h1>
            <a href="/rentals/${rentalId}" class="btn btn-secondary">← Back to Rental</a>
        </div>

        <div id="loading" class="loading">Loading...</div>
        <div id="error" class="error" style="display: none;"></div>

        <div id="reservation-form-container" style="display: none;">
            <div class="form-section">
                <form id="create-reservation-form">
                    <div class="form-group">
                        <label>Rental</label>
                        <div id="rental-name-display" style="padding: 10px 0; font-weight: 500;"></div>
                    </div>
                    <div class="form-group">
                        <label>Date</label>
                        <input type="text" value="${formatDateDisplay(date)}" disabled>
                    </div>
                    <div class="form-group">
                        <label for="reserved-by">Reserved By *</label>
                        <input type="text" id="reserved-by" required>
                    </div>
                    <div class="form-group">
                        <label for="reservation-notes">Notes</label>
                        <textarea id="reservation-notes" rows="4"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Create Reservation</button>
                        <a href="/rentals/${rentalId}" class="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    `;

    await loadRentalForReservation(rentalId, date);
}

// Load rental details for creating reservation
async function loadRentalForReservation(rentalId, date) {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const formContainer = document.getElementById('reservation-form-container');

    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';

        // Fetch rental to get the name
        const rentalResponse = await fetch(`${API_BASE_URL}/rentals/${rentalId}`);
        if (!rentalResponse.ok) {
            throw new Error('Rental not found');
        }
        const rental = await rentalResponse.json();

        // Display rental name
        const rentalNameDiv = document.getElementById('rental-name-display');
        if (rentalNameDiv) {
            rentalNameDiv.textContent = rental.name;
        }

        // Set up form submission
        const form = document.getElementById('create-reservation-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await createReservation(rentalId, date);
        };

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (formContainer) formContainer.style.display = 'block';

    } catch (error) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
}

// Create a new reservation
async function createReservation(rentalId, date) {
    const reservedBy = document.getElementById('reserved-by').value.trim();
    const notes = document.getElementById('reservation-notes').value.trim();

    if (!reservedBy) {
        alert('Reserved By is required');
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/rentals/${rentalId}/reservations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dates: [date],
                reservedBy,
                notes
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to create reservation');
        }

        // Redirect back to rental view
        navigateTo(`/rentals/${rentalId}`);

    } catch (error) {
        alert('Error creating reservation: ' + error.message);
    }
}

// Render View Reservation Page
async function renderViewReservation(rentalId, date) {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Reservation Details</h1>
            <a href="/reservations" class="btn btn-secondary">← Back to Reservations</a>
        </div>

        <div id="loading" class="loading">Loading reservation details...</div>
        <div id="error" class="error" style="display: none;"></div>

        <div id="reservation-details" style="display: none;">
            <div class="rental-view-card">
                <div class="rental-view-header">
                    <h2 id="view-reservation-date"></h2>
                    <div class="rental-view-actions">
                        <a href="/reservations/edit/${rentalId}/${date}" class="btn btn-primary">Edit</a>
                    </div>
                </div>

                <div class="rental-view-body">
                    <div class="rental-view-field">
                        <label class="rental-view-label">Rental</label>
                        <div id="view-reservation-rental" class="rental-view-value"></div>
                    </div>
                    <div class="rental-view-field">
                        <label class="rental-view-label">Reserved By</label>
                        <div id="view-reservation-reserved-by" class="rental-view-value"></div>
                    </div>
                    <div class="rental-view-field">
                        <label class="rental-view-label">Notes</label>
                        <div id="view-reservation-notes" class="rental-view-value"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadReservationDetails(rentalId, date);
}

// Load reservation details for view page
async function loadReservationDetails(rentalId, date) {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const detailsDiv = document.getElementById('reservation-details');

    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';
        if (detailsDiv) detailsDiv.style.display = 'none';

        // Fetch reservation
        const resResponse = await authenticatedFetch(`${API_BASE_URL}/rentals/${rentalId}/reservations?startDate=${date}&endDate=${date}`);

        if (!resResponse.ok) {
            throw new Error('Reservation not found');
        }

        const reservations = await resResponse.json();
        if (reservations.length === 0) {
            throw new Error('Reservation not found');
        }

        const reservation = reservations[0];

        // Fetch rental to get the name
        const rentalResponse = await fetch(`${API_BASE_URL}/rentals/${rentalId}`);
        let rentalName = 'Unknown Rental';
        if (rentalResponse.ok) {
            const rental = await rentalResponse.json();
            rentalName = rental.name;
        }

        // Display reservation details
        document.getElementById('view-reservation-date').textContent = formatDateDisplay(date);

        const rentalDiv = document.getElementById('view-reservation-rental');
        if (rentalDiv) {
            rentalDiv.innerHTML = `<a href="/rentals/${rentalId}" class="rental-name-link">${escapeHtml(rentalName)}</a>`;
        }

        const reservedByDiv = document.getElementById('view-reservation-reserved-by');
        if (reservedByDiv) {
            reservedByDiv.textContent = reservation.reservedBy || '';
        }

        const notesDiv = document.getElementById('view-reservation-notes');
        if (notesDiv) {
            notesDiv.textContent = reservation.notes || '';
        }

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (detailsDiv) detailsDiv.style.display = 'block';

    } catch (error) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
}

// Render Edit Reservation Page
async function renderEditReservation(rentalId, date) {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Edit Reservation</h1>
            <a href="/reservations" class="btn btn-secondary">← Back to Reservations</a>
        </div>

        <div id="loading" class="loading">Loading reservation...</div>
        <div id="error" class="error" style="display: none;"></div>

        <div id="reservation-form-container" style="display: none;">
            <div class="form-section">
                <form id="edit-reservation-form">
                    <div class="form-group">
                        <label>Date</label>
                        <input type="text" value="${formatDateDisplay(date)}" disabled>
                    </div>
                    <div class="form-group">
                        <label for="edit-reserved-by">Reserved By *</label>
                        <input type="text" id="edit-reserved-by" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-notes">Notes</label>
                        <textarea id="edit-notes" rows="4"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <a href="/reservations" class="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>

            <div class="form-section" style="margin-top: 2rem;">
                <h2 class="card-header" style="color: var(--danger); border-bottom: 2px solid var(--danger); padding-bottom: 0.5rem; margin-bottom: 1rem;">Danger Zone</h2>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
                    These actions are irreversible and will permanently delete data from the system.
                </p>
                <div>
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">Delete Reservation</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.875rem;">
                        Permanently delete this reservation. This action cannot be undone.
                    </p>
                    <button type="button" class="btn btn-delete" id="delete-reservation-btn">
                        Delete Reservation
                    </button>
                </div>
            </div>
        </div>
    `;

    await loadReservationForEdit(rentalId, date);
}

// Load reservation data for editing
async function loadReservationForEdit(rentalId, date) {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const formContainer = document.getElementById('reservation-form-container');

    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';

        const response = await authenticatedFetch(`${API_BASE_URL}/rentals/${rentalId}/reservations?startDate=${date}&endDate=${date}`);

        if (!response.ok) {
            throw new Error('Failed to load reservation');
        }

        const reservations = await response.json();
        if (reservations.length === 0) {
            throw new Error('Reservation not found');
        }

        const reservation = reservations[0];

        // Populate form
        document.getElementById('edit-reserved-by').value = reservation.reservedBy || '';
        document.getElementById('edit-notes').value = reservation.notes || '';

        // Set up form submission
        const form = document.getElementById('edit-reservation-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await saveReservationEdit(rentalId, date);
        };

        // Set up delete button
        const deleteBtn = document.getElementById('delete-reservation-btn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                await deleteReservationFromEditPage(rentalId, date);
            };
        }

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (formContainer) formContainer.style.display = 'block';

    } catch (error) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
}

// Save reservation edit
async function saveReservationEdit(rentalId, date) {
    const reservedBy = document.getElementById('edit-reserved-by').value.trim();
    const notes = document.getElementById('edit-notes').value.trim();

    if (!reservedBy) {
        alert('Reserved By is required');
        return;
    }

    try {
        // Delete old reservation
        await authenticatedFetch(`${API_BASE_URL}/rentals/${rentalId}/reservations/${date}`, {
            method: 'DELETE'
        });

        // Create new reservation with updated data
        const response = await authenticatedFetch(`${API_BASE_URL}/rentals/${rentalId}/reservations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dates: [date],
                reservedBy,
                notes
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update reservation');
        }

        // Redirect back to reservations list
        navigateTo('/reservations');

    } catch (error) {
        alert('Error updating reservation: ' + error.message);
    }
}

// Delete reservation from edit page
async function deleteReservationFromEditPage(rentalId, date) {
    if (!confirm(`Are you sure you want to delete this reservation for ${formatDateDisplay(date)}?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/rentals/${rentalId}/reservations/${date}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete reservation');
        }

        // Redirect back to reservations list
        navigateTo('/reservations');

    } catch (error) {
        alert('Error deleting reservation: ' + error.message);
    }
}

// Render Rental View Page
async function renderRentalView(rentalId) {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Rental Details</h1>
            <a href="/" class="btn btn-secondary">Back to Rentals</a>
        </div>

        <div id="loading" class="loading">Loading rental details...</div>
        <div id="view-error" class="error" style="display: none;"></div>

        <div id="rental-details" style="display: none;">
            <div class="rental-view-card">
                <div class="rental-view-header">
                    <h2 id="view-rental-name"></h2>
                    <div class="rental-view-actions">
                        <button onclick="openCalendarModal('${rentalId}')" class="btn btn-primary">Check Availability</button>
                        ${isAuthenticated ? `<a href="/rentals/edit/${rentalId}" class="btn btn-secondary">Edit</a>` : ''}
                    </div>
                </div>

                <div class="rental-view-body">
                    <div class="rental-view-field">
                        <label class="rental-view-label">Description</label>
                        <div id="view-rental-description" class="rental-view-value"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Calendar Modal -->
        <div id="calendar-modal" class="modal-overlay">
            <div class="modal-content">
                <div id="calendar-container"></div>
            </div>
        </div>
    `;

    await loadRentalDetails(rentalId);
}

// Load rental details for view page
async function loadRentalDetails(rentalId) {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('view-error');
    const detailsDiv = document.getElementById('rental-details');

    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';
        if (detailsDiv) detailsDiv.style.display = 'none';

        const response = await fetch(`${API_BASE_URL}/rentals/${rentalId}`);

        if (!response.ok) {
            throw new Error('Rental not found');
        }

        const rental = await response.json();

        // Populate the view
        document.getElementById('view-rental-name').textContent = rental.name;
        document.getElementById('view-rental-description').textContent = rental.description || 'No description provided';

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (detailsDiv) detailsDiv.style.display = 'block';

        // Store rental ID for calendar modal
        calendarState.rentalId = rentalId;

    } catch (error) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
}

// Delete rental from edit page
async function deleteRentalFromEdit(id) {
    if (!confirm('Are you sure you want to delete this rental? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/rentals/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete rental');
        }

        // Navigate back to rentals list
        navigateTo('/');
    } catch (error) {
        const errorDiv = document.getElementById('form-error');
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
}

// Load all rentals
async function loadRentals() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const emptyState = document.getElementById('empty-state');

    if (!loadingDiv) return;

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/rentals`);

        if (!response.ok) {
            throw new Error('Failed to load rentals');
        }

        const rentals = await response.json();
        displayRentals(rentals);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Display rentals in card grid
function displayRentals(rentals) {
    const rentalsGrid = document.getElementById('rentals-grid');
    const emptyState = document.getElementById('empty-state');

    if (!rentalsGrid) return;

    rentalsGrid.innerHTML = '';

    if (rentals.length === 0) {
        rentalsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    rentalsGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    rentals.forEach(rental => {
        const card = document.createElement('div');
        card.className = 'rental-card';
        card.style.cursor = 'default';
        card.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <h3 class="rental-card-name" style="margin-bottom: 0.75rem;">${escapeHtml(rental.name)}</h3>
                ${rental.description ? `<p class="rental-card-description" style="margin: 0; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(rental.description)}</p>` : '<p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary); font-style: italic;">No description</p>'}
            </div>
            <div style="display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                <a href="/rentals/${rental.id}" class="btn btn-primary" title="View details" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <img src="https://cdn.jsdelivr.net/npm/remixicon@4.8.0/icons/System/eye-fill.svg" alt="Details" style="width: 18px; height: 18px; filter: brightness(0) invert(1);">
                    <span>Details</span>
                </a>
                ${isAuthenticated ? `
                <a href="/rentals/edit/${rental.id}" class="btn btn-secondary" title="Edit rental" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <img src="https://cdn.jsdelivr.net/npm/remixicon@4.8.0/icons/Design/pencil-ai-fill.svg" alt="Edit" style="width: 18px; height: 18px; filter: brightness(0) invert(1);">
                    <span>Edit</span>
                </a>
                ` : ''}
            </div>
        `;
        rentalsGrid.appendChild(card);
    });
}

// Load rental data for editing
async function loadRentalForEdit(rentalId) {
    try {
        const response = await fetch(`${API_BASE_URL}/rentals/${rentalId}`);

        if (!response.ok) {
            throw new Error('Failed to load rental');
        }

        const rental = await response.json();

        document.getElementById('rental-name').value = rental.name;
        document.getElementById('rental-description').value = rental.description || '';
    } catch (error) {
        showFormError(error.message);
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const rentalId = document.getElementById('rental-id').value;
    const rentalData = {
        name: document.getElementById('rental-name').value.trim(),
        description: document.getElementById('rental-description').value.trim()
    };

    try {
        if (rentalId) {
            await updateRental(rentalId, rentalData);
        } else {
            await createRental(rentalData);
        }

        // Navigate back to rentals list
        navigateTo('/');
    } catch (error) {
        showFormError(error.message);
    }
}

// Create new rental
async function createRental(rentalData) {
    const response = await fetch(`${API_BASE_URL}/rentals`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(rentalData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create rental');
    }

    return response.json();
}

// Update existing rental
async function updateRental(id, rentalData) {
    const response = await authenticatedFetch(`${API_BASE_URL}/rentals/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(rentalData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rental');
    }

    return response.json();
}

// Delete rental
async function deleteRental(id) {
    if (!confirm('Are you sure you want to delete this rental?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/rentals/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete rental');
        }

        // Reload rentals list
        await loadRentals();
    } catch (error) {
        showError(error.message);
    }
}

// UI helpers
function showLoading() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (errorDiv) errorDiv.style.display = 'none';
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function showFormError(message) {
    const errorDiv = document.getElementById('form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Availability Calendar Functions (for Edit Rental page)
async function renderAvailabilityCalendar(rentalId) {
    const container = document.getElementById('availability-calendar-container');
    if (!container) return;

    availabilityCalendarState.rentalId = rentalId;

    container.innerHTML = `
        <div class="calendar-card">
            <div class="calendar-header" style="padding: 1rem 2rem; border-bottom: 1px solid var(--border); background-color: var(--bg-gray); display: flex; justify-content: space-between; align-items: center;">
                <div style="width: 2rem;"></div>
                <div class="calendar-nav">
                    <button class="calendar-nav-btn" onclick="navigateAvailabilityCalendar(-1)">Previous</button>
                    <span class="calendar-month-year" id="availability-month-year"></span>
                    <button class="calendar-nav-btn" onclick="navigateAvailabilityCalendar(1)">Next</button>
                </div>
                <button class="modal-close" onclick="closeAvailabilityCalendarModal()" aria-label="Close">&times;</button>
            </div>
            <div class="calendar-body">
                <div id="availability-grid" class="calendar-grid"></div>
            </div>
        </div>
    `;

    await loadAvailableDatesForMonth();
}

async function loadAvailableDatesForMonth() {
    const { currentMonth, currentYear, rentalId } = availabilityCalendarState;

    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    const startDateStr = formatDateForAPI(startDate);
    const endDateStr = formatDateForAPI(endDate);

    try {
        // Load available dates
        const availResponse = await fetch(
            `${API_BASE_URL}/rentals/${rentalId}/availability?startDate=${startDateStr}&endDate=${endDateStr}`
        );

        if (availResponse.ok) {
            const dates = await availResponse.json();
            availabilityCalendarState.availableDates = dates.map(d => d.date);
        } else {
            availabilityCalendarState.availableDates = [];
        }

        // Load reservations
        const resResponse = await fetch(
            `${API_BASE_URL}/rentals/${rentalId}/reservations?startDate=${startDateStr}&endDate=${endDateStr}`
        );

        if (resResponse.ok) {
            const reservations = await resResponse.json();
            availabilityCalendarState.reservedDates = reservations.map(r => r.date);
        } else {
            availabilityCalendarState.reservedDates = [];
        }
    } catch (error) {
        console.error('Failed to load available dates:', error);
        availabilityCalendarState.availableDates = [];
        availabilityCalendarState.reservedDates = [];
    }

    renderAvailabilityGrid();
}

function renderAvailabilityGrid() {
    const gridContainer = document.getElementById('availability-grid');
    const monthYearDisplay = document.getElementById('availability-month-year');

    if (!gridContainer || !monthYearDisplay) return;

    const { currentMonth, currentYear, availableDates, reservedDates } = availabilityCalendarState;

    // Update month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Clear grid
    gridContainer.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        gridContainer.appendChild(header);
    });

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day other-month';
        gridContainer.appendChild(emptyCell);
    }

    // Create sets for quick lookup
    const availableDatesSet = new Set(availableDates);
    const reservedDatesSet = new Set(reservedDates);

    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        date.setHours(0, 0, 0, 0);
        const dateStr = formatDateForAPI(date);

        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = day;
        dayCell.dataset.date = dateStr;

        const isPast = date < today;
        const isToday = date.getTime() === today.getTime();
        const isAvailable = availableDatesSet.has(dateStr);
        const isReserved = reservedDatesSet.has(dateStr);

        if (isPast) {
            dayCell.classList.add('past');
            dayCell.style.cursor = 'not-allowed';
        } else if (isReserved) {
            // Reserved dates: shaded red with no interaction
            dayCell.classList.add('has-reservation');
            dayCell.style.cursor = 'not-allowed';
        } else {
            if (isAvailable) {
                dayCell.classList.add('available');
            } else {
                dayCell.classList.add('past'); // Use 'past' styling for unavailable
            }
            dayCell.onclick = () => toggleAvailability(dateStr);
        }

        if (isToday) {
            dayCell.classList.add('today');
        }

        gridContainer.appendChild(dayCell);
    }
}

function navigateAvailabilityCalendar(direction) {
    availabilityCalendarState.currentMonth += direction;

    if (availabilityCalendarState.currentMonth > 11) {
        availabilityCalendarState.currentMonth = 0;
        availabilityCalendarState.currentYear++;
    } else if (availabilityCalendarState.currentMonth < 0) {
        availabilityCalendarState.currentMonth = 11;
        availabilityCalendarState.currentYear--;
    }

    loadAvailableDatesForMonth();
}

async function toggleAvailability(dateStr) {
    const { rentalId, availableDates } = availabilityCalendarState;
    const isCurrentlyAvailable = availableDates.includes(dateStr);

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/rentals/${rentalId}/availability`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dates: [dateStr],
                action: isCurrentlyAvailable ? 'remove' : 'add'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update availability');
        }

        // Update local state
        if (isCurrentlyAvailable) {
            availabilityCalendarState.availableDates = availableDates.filter(d => d !== dateStr);
        } else {
            availabilityCalendarState.availableDates.push(dateStr);
        }

        renderAvailabilityGrid();

        // Refresh the availability summary
        await loadAvailabilitySummary(rentalId);

    } catch (error) {
        alert('Error updating availability: ' + error.message);
    }
}

// Load and display availability summary
async function loadAvailabilitySummary(rentalId) {
    const summaryContainer = document.getElementById('availability-summary');
    if (!summaryContainer) return;

    try {
        // Get date range for the next year from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneYearFromNow = new Date(today);
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        const startDateStr = formatDateForAPI(today);
        const endDateStr = formatDateForAPI(oneYearFromNow);

        // Load available dates and reservations
        const [availResponse, resResponse] = await Promise.all([
            authenticatedFetch(`${API_BASE_URL}/rentals/${rentalId}/availability?startDate=${startDateStr}&endDate=${endDateStr}`),
            fetch(`${API_BASE_URL}/rentals/${rentalId}/reservations?startDate=${startDateStr}&endDate=${endDateStr}`)
        ]);

        let availableDates = [];
        let reservations = [];

        if (availResponse.ok) {
            const dates = await availResponse.json();
            availableDates = dates.map(d => d.date).sort();
        }

        if (resResponse.ok) {
            reservations = await resResponse.json();
            reservations.sort((a, b) => a.date.localeCompare(b.date));
        }

        // Build the summary HTML
        let html = '';

        if (availableDates.length > 0) {
            html += '<div style="margin-bottom: 1rem;"><strong>Available Dates:</strong><ul style="margin: 0.5rem 0 0 1.5rem;">';
            availableDates.forEach(date => {
                html += `<li>${formatDateDisplay(date)}</li>`;
            });
            html += '</ul></div>';
        } else {
            html += '<div style="margin-bottom: 1rem; color: var(--text-secondary);">No available dates set</div>';
        }

        if (reservations.length > 0) {
            html += '<div><strong>Reserved Dates:</strong><ul style="margin: 0.5rem 0 0 1.5rem;">';
            reservations.forEach(res => {
                html += `<li>${formatDateDisplay(res.date)} - ${escapeHtml(res.reservedBy)}</li>`;
            });
            html += '</ul></div>';
        }

        summaryContainer.innerHTML = html;

    } catch (error) {
        console.error('Failed to load availability summary:', error);
        summaryContainer.innerHTML = '<div style="color: var(--text-secondary);">Failed to load availability information</div>';
    }
}

// Open availability calendar modal
async function openAvailabilityCalendarModal(rentalId) {
    const modal = document.getElementById('availability-calendar-modal');
    if (!modal) return;

    modal.classList.add('active');

    // Render calendar inside modal
    await renderAvailabilityCalendar(rentalId);
}

// Close availability calendar modal
function closeAvailabilityCalendarModal() {
    const modal = document.getElementById('availability-calendar-modal');
    if (modal) {
        modal.classList.remove('active');
    }

    // Reset calendar to current month
    const now = new Date();
    availabilityCalendarState.currentMonth = now.getMonth();
    availabilityCalendarState.currentYear = now.getFullYear();
}

// Calendar functions
// Open calendar modal
async function openCalendarModal(rentalId) {
    const modal = document.getElementById('calendar-modal');
    if (!modal) return;

    modal.classList.add('active');

    // Render calendar inside modal
    const container = document.getElementById('calendar-container');
    if (container) {
        await renderCalendar(rentalId);
    }
}

// Close calendar modal
function closeCalendarModal() {
    const modal = document.getElementById('calendar-modal');
    if (modal) {
        modal.classList.remove('active');
    }

    // Reset calendar to current month
    const now = new Date();
    calendarState.currentMonth = now.getMonth();
    calendarState.currentYear = now.getFullYear();
    calendarState.selectedDates = [];
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('calendar-modal');
    if (modal && e.target === modal) {
        closeCalendarModal();
    }

    const availabilityModal = document.getElementById('availability-calendar-modal');
    if (availabilityModal && e.target === availabilityModal) {
        closeAvailabilityCalendarModal();
    }
});

async function renderCalendar(rentalId) {
    const calendarContainer = document.getElementById('calendar-container');
    if (!calendarContainer) return;

    // Render calendar HTML
    calendarContainer.innerHTML = `
        <div class="calendar-card">
            <div class="calendar-header" style="padding: 1rem 2rem; border-bottom: 1px solid var(--border); background-color: var(--bg-gray); display: flex; justify-content: space-between; align-items: center;">
                <div style="width: 2rem;"></div>
                <div class="calendar-nav">
                    <button class="calendar-nav-btn" onclick="navigateCalendar(-1)">Previous</button>
                    <span class="calendar-month-year" id="calendar-month-year"></span>
                    <button class="calendar-nav-btn" onclick="navigateCalendar(1)">Next</button>
                </div>
                <button class="modal-close" onclick="closeCalendarModal()" aria-label="Close">&times;</button>
            </div>
            <div class="calendar-body">
                <div id="calendar-grid" class="calendar-grid"></div>
            </div>
        </div>
    `;

    // Load reservations for current month
    await loadReservationsForMonth();
}

async function loadReservationsForMonth() {
    const { currentMonth, currentYear, rentalId } = calendarState;

    // Calculate date range for the month
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    const startDateStr = formatDateForAPI(startDate);
    const endDateStr = formatDateForAPI(endDate);

    try {
        // Load both reservations and available dates
        const [reservationsRes, availabilityRes] = await Promise.all([
            fetch(`${API_BASE_URL}/rentals/${rentalId}/reservations?startDate=${startDateStr}&endDate=${endDateStr}`),
            authenticatedFetch(`${API_BASE_URL}/rentals/${rentalId}/availability?startDate=${startDateStr}&endDate=${endDateStr}`)
        ]);

        if (reservationsRes.ok) {
            calendarState.reservations = await reservationsRes.json();
        } else {
            calendarState.reservations = [];
        }

        if (availabilityRes.ok) {
            const dates = await availabilityRes.json();
            calendarState.availableDates = dates.map(d => d.date);
        } else {
            calendarState.availableDates = [];
        }
    } catch (error) {
        console.error('Failed to load calendar data:', error);
        calendarState.reservations = [];
        calendarState.availableDates = [];
    }

    renderCalendarGrid();
}

function renderCalendarGrid() {
    const gridContainer = document.getElementById('calendar-grid');
    const monthYearDisplay = document.getElementById('calendar-month-year');

    if (!gridContainer || !monthYearDisplay) return;

    const { currentMonth, currentYear, reservations, selectedDates, availableDates } = calendarState;

    // Update month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Clear grid
    gridContainer.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        gridContainer.appendChild(header);
    });

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day other-month';
        gridContainer.appendChild(emptyCell);
    }

    // Create sets for quick lookup
    const reservedDates = new Set(reservations.map(r => r.date));
    const availableDatesSet = new Set(availableDates);

    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        date.setHours(0, 0, 0, 0);
        const dateStr = formatDateForAPI(date);

        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.dataset.date = dateStr;

        // Determine cell state
        const isPast = date < today;
        const isToday = date.getTime() === today.getTime();
        const isAvailable = availableDatesSet.has(dateStr);
        const isReserved = reservedDates.has(dateStr);

        if (isPast) {
            dayCell.classList.add('past');
            dayCell.textContent = day;
        } else if (!isAvailable) {
            // Date is not marked as available in settings
            dayCell.classList.add('past');
            dayCell.title = 'Not available for reservations';
            dayCell.textContent = day;
        } else if (isReserved) {
            dayCell.classList.add('reserved');
            dayCell.textContent = day;
        } else {
            // Available date - show date with reserve link
            dayCell.classList.add('available');
            dayCell.innerHTML = `
                <div style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">${day}</div>
                <a href="/reservations/new/${calendarState.rentalId}/${dateStr}"
                   class="calendar-reserve-link">
                    Reserve
                </a>
            `;
        }

        if (isToday) {
            dayCell.classList.add('today');
        }

        gridContainer.appendChild(dayCell);
    }
}

function navigateCalendar(direction) {
    calendarState.currentMonth += direction;

    if (calendarState.currentMonth > 11) {
        calendarState.currentMonth = 0;
        calendarState.currentYear++;
    } else if (calendarState.currentMonth < 0) {
        calendarState.currentMonth = 11;
        calendarState.currentYear--;
    }

    calendarState.selectedDates = [];
    loadReservationsForMonth();
    hideReservationForm();
}

// Helper functions
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getDatesBetween(startStr, endStr) {
    const dates = [];
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');

    const current = new Date(start);
    while (current <= end) {
        dates.push(formatDateForAPI(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}
