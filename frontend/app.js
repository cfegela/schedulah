const API_BASE_URL = '/api';

// State
let currentItem = null;

// Calendar state (for reservation calendar)
let calendarState = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDates: [],
    reservations: [],
    availableDates: [],
    itemId: null
};

// Availability calendar state (for edit item page)
let availabilityCalendarState = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    availableDates: [],
    itemId: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initRouter();
});

// Simple hash-based router
function initRouter() {
    function handleRoute() {
        const hash = window.location.hash || '#/';
        const viewContainer = document.getElementById('view-container');

        if (!viewContainer) return;

        // Update active nav link
        updateActiveNavLink();

        // Route handling
        if (hash === '#/' || hash === '#/items') {
            renderItemsList();
        } else if (hash === '#/items/new') {
            renderItemForm('create');
        } else if (hash.startsWith('#/items/edit/')) {
            const itemId = hash.split('/').pop();
            renderItemForm('edit', itemId);
        } else if (hash.startsWith('#/items/')) {
            const itemId = hash.split('/').pop();
            if (itemId && itemId !== 'new') {
                renderItemView(itemId);
            } else {
                renderItemsList();
            }
        } else if (hash === '#/reservations') {
            renderReservations();
        } else if (hash.startsWith('#/reservations/new/')) {
            const parts = hash.split('/');
            const itemId = parts[3];
            const date = parts[4];
            if (itemId && date) {
                renderCreateReservation(itemId, date);
            } else {
                renderReservations();
            }
        } else if (hash.startsWith('#/reservations/edit/')) {
            const parts = hash.split('/');
            const itemId = parts[3];
            const date = parts[4];
            if (itemId && date) {
                renderEditReservation(itemId, date);
            } else {
                renderReservations();
            }
        } else if (hash.startsWith('#/reservations/')) {
            const parts = hash.split('/');
            const itemId = parts[2];
            const date = parts[3];
            if (itemId && date && parts[2] !== 'edit' && parts[2] !== 'new') {
                renderViewReservation(itemId, date);
            } else {
                renderReservations();
            }
        } else if (hash === '#/about') {
            renderAbout();
        } else if (hash === '#/faq') {
            renderFaq();
        } else {
            renderItemsList();
        }
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);

    // Initial route
    handleRoute();
}

function updateActiveNavLink() {
    const hash = window.location.hash || '#/';
    const links = document.querySelectorAll('.navbar-link');

    links.forEach(link => {
        const href = link.getAttribute('href');
        const isActive = href === hash || (href === '#/' && hash === '#/items');

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

// Render Items List View
async function renderItemsList() {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Items</h1>
            <a href="#/items/new" class="btn btn-primary">Create New Item</a>
        </div>

        <div class="items-section">
            <div id="loading" class="loading">Loading items...</div>
            <div id="error" class="error" style="display: none;"></div>
            <table id="items-table" style="display: none;">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="items-tbody">
                </tbody>
            </table>
            <div id="empty-state" style="display: none;" class="empty-state">
                <p>No items yet. Create one to get started!</p>
                <a href="#/items/new" class="btn btn-primary" style="margin-top: 1rem;">Create Your First Item</a>
            </div>
        </div>
    `;

    await loadItems();
}

// Render Item Form View (Create or Edit)
async function renderItemForm(mode, itemId = null) {
    const viewContainer = document.getElementById('view-container');
    const isEdit = mode === 'edit';

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">${isEdit ? 'Edit Item' : 'Create New Item'}</h1>
            <a href="#/" class="btn btn-secondary">Back to Items</a>
        </div>

        <div class="form-section">
            <div id="form-error" class="error" style="display: none;"></div>
            <form id="item-form">
                <input type="hidden" id="item-id" value="${itemId || ''}">
                <div class="form-group">
                    <label for="item-name">Name *</label>
                    <input type="text" id="item-name" required>
                </div>
                <div class="form-group">
                    <label for="item-description">Description</label>
                    <textarea id="item-description" rows="4"></textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary" id="submit-btn">
                        ${isEdit ? 'Update Item' : 'Create Item'}
                    </button>
                    <a href="#/" class="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>

        ${isEdit ? '<div id="availability-calendar-container"></div>' : ''}

        ${isEdit ? `
        <div class="form-section" style="margin-top: 2rem;">
            <h2 class="card-header" style="color: var(--danger); border-bottom: 2px solid var(--danger); padding-bottom: 0.5rem; margin-bottom: 1rem;">Danger Zone</h2>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
                These actions are irreversible and will permanently delete data from the system.
            </p>
            <div>
                <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">Delete Item</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.875rem;">
                    Permanently delete this item and all associated reservations. This action cannot be undone.
                </p>
                <button type="button" class="btn btn-delete" id="delete-item-btn">
                    Delete Item
                </button>
            </div>
        </div>
        ` : ''}
    `;

    // Load item data if editing
    if (isEdit && itemId) {
        await loadItemForEdit(itemId);
        // Initialize availability calendar for editing
        await renderAvailabilityCalendar(itemId);
    }

    // Attach form submit handler
    const form = document.getElementById('item-form');
    form.addEventListener('submit', handleFormSubmit);

    // Attach delete button handler if editing
    if (isEdit && itemId) {
        const deleteBtn = document.getElementById('delete-item-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteItemFromEdit(itemId));
        }
    }
}

// Render About Page
function renderAbout() {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">About Schedulah</h1>
            <a href="#/" class="btn btn-secondary">Back to Items</a>
        </div>

        <div class="form-section">
            <h2>About This Application</h2>
            <p>Schedulah is a simple items CRUD application built as a demonstration of modern web development practices.</p>

            <h3 style="margin-top: 2rem;">Technology Stack</h3>
            <ul style="margin-left: 2rem; margin-top: 1rem;">
                <li><strong>Backend:</strong> Python Lambda handlers (AWS-deployable)</li>
                <li><strong>Frontend:</strong> Vanilla JavaScript (no frameworks)</li>
                <li><strong>Database:</strong> DynamoDB Local</li>
                <li><strong>Deployment:</strong> Docker Compose</li>
            </ul>

            <h3 style="margin-top: 2rem;">Features</h3>
            <ul style="margin-left: 2rem; margin-top: 1rem;">
                <li>Create, read, update, and delete items</li>
                <li>Responsive design for mobile and desktop</li>
                <li>Clean, modern user interface</li>
                <li>RESTful API architecture</li>
                <li>Local development environment with hot reload</li>
            </ul>

            <div style="margin-top: 2rem;">
                <a href="#/" class="btn btn-primary">Get Started</a>
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
            <a href="#/" class="btn btn-secondary">Back to Items</a>
        </div>

        <div class="form-section">
            <h2>General Questions</h2>

            <h3 style="margin-top: 2rem;">What is Schedulah?</h3>
            <p>Schedulah is an item reservation system that allows you to manage items and their availability. You can create items, set which dates they're available, and make reservations for specific dates.</p>

            <h3 style="margin-top: 2rem;">How do I create an item?</h3>
            <p>Click on "Items" in the navigation menu, then click the "Create New Item" button. Fill in the item name and description, then click "Create Item".</p>

            <h3 style="margin-top: 2rem;">How do I set availability for an item?</h3>
            <p>After creating an item, click "Edit" from the item list or item details page. Scroll to the availability calendar and click on dates to toggle their availability. Green dates are available for reservations.</p>

            <h2 style="margin-top: 2.5rem;">Reservations</h2>

            <h3 style="margin-top: 2rem;">How do I make a reservation?</h3>
            <p>View an item's details page and use the reservation calendar. Click on an available date (shown in green), enter who the reservation is for and any notes, then submit the form.</p>

            <h3 style="margin-top: 2rem;">Can I reserve multiple days at once?</h3>
            <p>No, each reservation is for a single day. You'll need to create separate reservations for each date.</p>

            <h3 style="margin-top: 2rem;">How do I view all reservations?</h3>
            <p>Click "Reservations" in the navigation menu to see a list of all reservations across all items.</p>

            <h3 style="margin-top: 2rem;">How do I edit or cancel a reservation?</h3>
            <p>From the reservations list, click the eye icon to view the reservation, then click "Edit". You can update the details or scroll to the Danger Zone to delete the reservation.</p>

            <h2 style="margin-top: 2.5rem;">Data & Storage</h2>

            <h3 style="margin-top: 2rem;">Is my data saved?</h3>
            <p>Yes, all data is persisted in a local DynamoDB database that survives container restarts.</p>

            <h3 style="margin-top: 2rem;">Can I export my data?</h3>
            <p>Currently, there's no built-in export feature. Data is stored locally in the DynamoDB container.</p>

            <div style="margin-top: 2rem;">
                <a href="#/" class="btn btn-primary">Get Started</a>
            </div>
        </div>
    `;
}

// Render Reservations List View
async function renderReservations() {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Reservations</h1>
        </div>

        <div class="items-section">
            <div id="loading" class="loading">Loading reservations...</div>
            <div id="error" class="error" style="display: none;"></div>
            <table id="reservations-table" style="display: none;">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Item</th>
                        <th>Reserved By</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="reservations-tbody">
                </tbody>
            </table>
            <div id="empty-state" style="display: none;" class="empty-state">
                <p>No reservations yet.</p>
            </div>
        </div>
    `;

    await loadAllReservations();
}

// Load all reservations from all items
async function loadAllReservations() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const reservationsTable = document.getElementById('reservations-table');
    const emptyState = document.getElementById('empty-state');

    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';

        // First, get all items
        const itemsResponse = await fetch(`${API_BASE_URL}/items`);
        if (!itemsResponse.ok) {
            throw new Error('Failed to load items');
        }
        const items = await itemsResponse.json();

        // Create a map of itemId -> itemName for lookup
        const itemsMap = {};
        items.forEach(item => {
            itemsMap[item.id] = item.name;
        });

        // Then, get all reservations for each item
        const allReservations = [];
        for (const item of items) {
            const resResponse = await fetch(`${API_BASE_URL}/items/${item.id}/reservations`);
            if (resResponse.ok) {
                const reservations = await resResponse.json();
                reservations.forEach(res => {
                    allReservations.push({
                        ...res,
                        itemName: item.name
                    });
                });
            }
        }

        // Sort by date (most recent first)
        allReservations.sort((a, b) => b.date.localeCompare(a.date));

        if (loadingDiv) loadingDiv.style.display = 'none';

        if (allReservations.length === 0) {
            reservationsTable.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            displayReservations(allReservations);
            reservationsTable.style.display = 'table';
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

// Display reservations in table
function displayReservations(reservations) {
    const tbody = document.getElementById('reservations-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    reservations.forEach(reservation => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${formatDateDisplay(reservation.date)}</strong></td>
            <td>
                <a href="#/items/${reservation.itemId}" class="item-name-link">
                    ${escapeHtml(reservation.itemName)}
                </a>
            </td>
            <td>${escapeHtml(reservation.reservedBy)}</td>
            <td class="actions">
                <a href="#/reservations/${reservation.itemId}/${reservation.date}" class="btn btn-secondary action-btn" title="View details">
                    <img src="https://cdn.jsdelivr.net/npm/remixicon@4.8.0/icons/System/eye-fill.svg" alt="View" style="width: 20px; height: 20px; display: block;">
                </a>
                <a href="#/reservations/edit/${reservation.itemId}/${reservation.date}" class="btn btn-secondary action-btn" title="Edit reservation">
                    <img src="https://cdn.jsdelivr.net/npm/remixicon@4.8.0/icons/Design/pencil-ai-fill.svg" alt="Edit" style="width: 20px; height: 20px; display: block;">
                </a>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render Create Reservation Page
async function renderCreateReservation(itemId, date) {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Create Reservation</h1>
            <a href="#/items/${itemId}" class="btn btn-secondary">← Back to Item</a>
        </div>

        <div id="loading" class="loading">Loading...</div>
        <div id="error" class="error" style="display: none;"></div>

        <div id="reservation-form-container" style="display: none;">
            <div class="form-section">
                <form id="create-reservation-form">
                    <div class="form-group">
                        <label>Item</label>
                        <div id="item-name-display" style="padding: 10px 0; font-weight: 500;"></div>
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
                        <a href="#/items/${itemId}" class="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    `;

    await loadItemForReservation(itemId, date);
}

// Load item details for creating reservation
async function loadItemForReservation(itemId, date) {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const formContainer = document.getElementById('reservation-form-container');

    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';

        // Fetch item to get the name
        const itemResponse = await fetch(`${API_BASE_URL}/items/${itemId}`);
        if (!itemResponse.ok) {
            throw new Error('Item not found');
        }
        const item = await itemResponse.json();

        // Display item name
        const itemNameDiv = document.getElementById('item-name-display');
        if (itemNameDiv) {
            itemNameDiv.textContent = item.name;
        }

        // Set up form submission
        const form = document.getElementById('create-reservation-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await createReservation(itemId, date);
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
async function createReservation(itemId, date) {
    const reservedBy = document.getElementById('reserved-by').value.trim();
    const notes = document.getElementById('reservation-notes').value.trim();

    if (!reservedBy) {
        alert('Reserved By is required');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/items/${itemId}/reservations`, {
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

        // Redirect back to item view
        window.location.hash = `#/items/${itemId}`;

    } catch (error) {
        alert('Error creating reservation: ' + error.message);
    }
}

// Render View Reservation Page
async function renderViewReservation(itemId, date) {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Reservation Details</h1>
            <a href="#/reservations" class="btn btn-secondary">← Back to Reservations</a>
        </div>

        <div id="loading" class="loading">Loading reservation details...</div>
        <div id="error" class="error" style="display: none;"></div>

        <div id="reservation-details" style="display: none;">
            <div class="item-view-card">
                <div class="item-view-header">
                    <h2 id="view-reservation-date"></h2>
                    <div class="item-view-actions">
                        <a href="#/reservations/edit/${itemId}/${date}" class="btn btn-primary">Edit</a>
                    </div>
                </div>

                <div class="item-view-body">
                    <div class="item-view-field">
                        <label class="item-view-label">Item</label>
                        <div id="view-reservation-item" class="item-view-value"></div>
                    </div>
                    <div class="item-view-field">
                        <label class="item-view-label">Reserved By</label>
                        <div id="view-reservation-reserved-by" class="item-view-value"></div>
                    </div>
                    <div class="item-view-field">
                        <label class="item-view-label">Notes</label>
                        <div id="view-reservation-notes" class="item-view-value"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadReservationDetails(itemId, date);
}

// Load reservation details for view page
async function loadReservationDetails(itemId, date) {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const detailsDiv = document.getElementById('reservation-details');

    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';
        if (detailsDiv) detailsDiv.style.display = 'none';

        // Fetch reservation
        const resResponse = await fetch(`${API_BASE_URL}/items/${itemId}/reservations?startDate=${date}&endDate=${date}`);

        if (!resResponse.ok) {
            throw new Error('Reservation not found');
        }

        const reservations = await resResponse.json();
        if (reservations.length === 0) {
            throw new Error('Reservation not found');
        }

        const reservation = reservations[0];

        // Fetch item to get the name
        const itemResponse = await fetch(`${API_BASE_URL}/items/${itemId}`);
        let itemName = 'Unknown Item';
        if (itemResponse.ok) {
            const item = await itemResponse.json();
            itemName = item.name;
        }

        // Display reservation details
        document.getElementById('view-reservation-date').textContent = formatDateDisplay(date);

        const itemDiv = document.getElementById('view-reservation-item');
        if (itemDiv) {
            itemDiv.innerHTML = `<a href="#/items/${itemId}" class="item-name-link">${escapeHtml(itemName)}</a>`;
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
async function renderEditReservation(itemId, date) {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Edit Reservation</h1>
            <a href="#/reservations" class="btn btn-secondary">← Back to Reservations</a>
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
                        <a href="#/reservations" class="btn btn-secondary">Cancel</a>
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

    await loadReservationForEdit(itemId, date);
}

// Load reservation data for editing
async function loadReservationForEdit(itemId, date) {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const formContainer = document.getElementById('reservation-form-container');

    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';

        const response = await fetch(`${API_BASE_URL}/items/${itemId}/reservations?startDate=${date}&endDate=${date}`);

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
            await saveReservationEdit(itemId, date);
        };

        // Set up delete button
        const deleteBtn = document.getElementById('delete-reservation-btn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                await deleteReservationFromEditPage(itemId, date);
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
async function saveReservationEdit(itemId, date) {
    const reservedBy = document.getElementById('edit-reserved-by').value.trim();
    const notes = document.getElementById('edit-notes').value.trim();

    if (!reservedBy) {
        alert('Reserved By is required');
        return;
    }

    try {
        // Delete old reservation
        await fetch(`${API_BASE_URL}/items/${itemId}/reservations/${date}`, {
            method: 'DELETE'
        });

        // Create new reservation with updated data
        const response = await fetch(`${API_BASE_URL}/items/${itemId}/reservations`, {
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
        window.location.hash = '#/reservations';

    } catch (error) {
        alert('Error updating reservation: ' + error.message);
    }
}

// Delete reservation from edit page
async function deleteReservationFromEditPage(itemId, date) {
    if (!confirm(`Are you sure you want to delete this reservation for ${formatDateDisplay(date)}?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/items/${itemId}/reservations/${date}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete reservation');
        }

        // Redirect back to reservations list
        window.location.hash = '#/reservations';

    } catch (error) {
        alert('Error deleting reservation: ' + error.message);
    }
}

// Render Item View Page
async function renderItemView(itemId) {
    const viewContainer = document.getElementById('view-container');

    viewContainer.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Item Details</h1>
            <a href="#/" class="btn btn-secondary">Back to Items</a>
        </div>

        <div id="loading" class="loading">Loading item details...</div>
        <div id="view-error" class="error" style="display: none;"></div>

        <div id="item-details" style="display: none;">
            <div class="item-view-card">
                <div class="item-view-header">
                    <h2 id="view-item-name"></h2>
                    <div class="item-view-actions">
                        <button onclick="openCalendarModal('${itemId}')" class="btn btn-primary">Check Availability</button>
                        <a href="#/items/edit/${itemId}" class="btn btn-secondary">Edit</a>
                    </div>
                </div>

                <div class="item-view-body">
                    <div class="item-view-field">
                        <label class="item-view-label">Description</label>
                        <div id="view-item-description" class="item-view-value"></div>
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

    await loadItemDetails(itemId);
}

// Load item details for view page
async function loadItemDetails(itemId) {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('view-error');
    const detailsDiv = document.getElementById('item-details');

    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';
        if (detailsDiv) detailsDiv.style.display = 'none';

        const response = await fetch(`${API_BASE_URL}/items/${itemId}`);

        if (!response.ok) {
            throw new Error('Item not found');
        }

        const item = await response.json();

        // Populate the view
        document.getElementById('view-item-name').textContent = item.name;
        document.getElementById('view-item-description').textContent = item.description || 'No description provided';

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (detailsDiv) detailsDiv.style.display = 'block';

        // Store item ID for calendar modal
        calendarState.itemId = itemId;

    } catch (error) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
}

// Delete item from edit page
async function deleteItemFromEdit(id) {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/items/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete item');
        }

        // Navigate back to items list
        window.location.hash = '#/';
    } catch (error) {
        const errorDiv = document.getElementById('form-error');
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
}

// Load all items
async function loadItems() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const itemsTable = document.getElementById('items-table');
    const emptyState = document.getElementById('empty-state');

    if (!loadingDiv) return;

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/items`);

        if (!response.ok) {
            throw new Error('Failed to load items');
        }

        const items = await response.json();
        displayItems(items);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Display items in table
function displayItems(items) {
    const itemsTable = document.getElementById('items-table');
    const itemsTbody = document.getElementById('items-tbody');
    const emptyState = document.getElementById('empty-state');

    if (!itemsTbody) return;

    itemsTbody.innerHTML = '';

    if (items.length === 0) {
        itemsTable.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    itemsTable.style.display = 'table';
    emptyState.style.display = 'none';

    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><a href="#/items/${item.id}" class="item-name-link"><strong>${escapeHtml(item.name)}</strong></a></td>
            <td class="item-description">${escapeHtml(item.description || '')}</td>
            <td class="actions">
                <a href="#/items/${item.id}" class="btn btn-secondary action-btn" title="View details">
                    <img src="https://cdn.jsdelivr.net/npm/remixicon@4.8.0/icons/System/eye-fill.svg" alt="View" style="width: 20px; height: 20px; display: block;">
                </a>
                <a href="#/items/edit/${item.id}" class="btn btn-secondary action-btn" title="Edit item">
                    <img src="https://cdn.jsdelivr.net/npm/remixicon@4.8.0/icons/Design/pencil-ai-fill.svg" alt="Edit" style="width: 20px; height: 20px; display: block;">
                </a>
            </td>
        `;
        itemsTbody.appendChild(row);
    });
}

// Load item data for editing
async function loadItemForEdit(itemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/items/${itemId}`);

        if (!response.ok) {
            throw new Error('Failed to load item');
        }

        const item = await response.json();

        document.getElementById('item-name').value = item.name;
        document.getElementById('item-description').value = item.description || '';
    } catch (error) {
        showFormError(error.message);
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const itemId = document.getElementById('item-id').value;
    const itemData = {
        name: document.getElementById('item-name').value.trim(),
        description: document.getElementById('item-description').value.trim()
    };

    try {
        if (itemId) {
            await updateItem(itemId, itemData);
        } else {
            await createItem(itemData);
        }

        // Navigate back to items list
        window.location.hash = '#/';
    } catch (error) {
        showFormError(error.message);
    }
}

// Create new item
async function createItem(itemData) {
    const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(itemData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create item');
    }

    return response.json();
}

// Update existing item
async function updateItem(id, itemData) {
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(itemData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update item');
    }

    return response.json();
}

// Delete item
async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/items/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete item');
        }

        // Reload items list
        await loadItems();
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

// Availability Calendar Functions (for Edit Item page)
async function renderAvailabilityCalendar(itemId) {
    const container = document.getElementById('availability-calendar-container');
    if (!container) return;

    availabilityCalendarState.itemId = itemId;

    container.innerHTML = `
        <div class="calendar-card" style="margin-top: 2rem;">
            <div class="calendar-header">
                <h3>Set Available Dates</h3>
                <div class="calendar-nav">
                    <button class="calendar-nav-btn" onclick="navigateAvailabilityCalendar(-1)">Previous</button>
                    <span class="calendar-month-year" id="availability-month-year"></span>
                    <button class="calendar-nav-btn" onclick="navigateAvailabilityCalendar(1)">Next</button>
                </div>
            </div>
            <div class="calendar-body">
                <div id="availability-grid" class="calendar-grid"></div>
            </div>
            <div class="calendar-legend">
                <div class="legend-item">
                    <div class="legend-color available"></div>
                    <span>Available for Reservations</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color past"></div>
                    <span>Not Available</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color today"></div>
                    <span>Today</span>
                </div>
            </div>
        </div>
    `;

    await loadAvailableDatesForMonth();
}

async function loadAvailableDatesForMonth() {
    const { currentMonth, currentYear, itemId } = availabilityCalendarState;

    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    const startDateStr = formatDateForAPI(startDate);
    const endDateStr = formatDateForAPI(endDate);

    try {
        const response = await fetch(
            `${API_BASE_URL}/items/${itemId}/availability?startDate=${startDateStr}&endDate=${endDateStr}`
        );

        if (response.ok) {
            const dates = await response.json();
            availabilityCalendarState.availableDates = dates.map(d => d.date);
        } else {
            availabilityCalendarState.availableDates = [];
        }
    } catch (error) {
        console.error('Failed to load available dates:', error);
        availabilityCalendarState.availableDates = [];
    }

    renderAvailabilityGrid();
}

function renderAvailabilityGrid() {
    const gridContainer = document.getElementById('availability-grid');
    const monthYearDisplay = document.getElementById('availability-month-year');

    if (!gridContainer || !monthYearDisplay) return;

    const { currentMonth, currentYear, availableDates } = availabilityCalendarState;

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

    // Create set of available dates for quick lookup
    const availableDatesSet = new Set(availableDates);

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

        if (isPast) {
            dayCell.classList.add('past');
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
    const { itemId, availableDates } = availabilityCalendarState;
    const isCurrentlyAvailable = availableDates.includes(dateStr);

    try {
        const response = await fetch(`${API_BASE_URL}/items/${itemId}/availability`, {
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

    } catch (error) {
        alert('Error updating availability: ' + error.message);
    }
}

// Calendar functions
// Open calendar modal
async function openCalendarModal(itemId) {
    const modal = document.getElementById('calendar-modal');
    if (!modal) return;

    modal.classList.add('active');

    // Render calendar inside modal
    const container = document.getElementById('calendar-container');
    if (container) {
        await renderCalendar(itemId);
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
});

async function renderCalendar(itemId) {
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
    const { currentMonth, currentYear, itemId } = calendarState;

    // Calculate date range for the month
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    const startDateStr = formatDateForAPI(startDate);
    const endDateStr = formatDateForAPI(endDate);

    try {
        // Load both reservations and available dates
        const [reservationsRes, availabilityRes] = await Promise.all([
            fetch(`${API_BASE_URL}/items/${itemId}/reservations?startDate=${startDateStr}&endDate=${endDateStr}`),
            fetch(`${API_BASE_URL}/items/${itemId}/availability?startDate=${startDateStr}&endDate=${endDateStr}`)
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
                <a href="#/reservations/new/${calendarState.itemId}/${dateStr}"
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
