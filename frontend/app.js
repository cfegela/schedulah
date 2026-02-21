const API_BASE_URL = '/api';

// State
let currentItem = null;

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
        } else if (hash === '#/about') {
            renderAbout();
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
                    ${isEdit ? `<button type="button" class="btn btn-delete" onclick="deleteItemFromEdit('${itemId}')">Delete</button>` : ''}
                </div>
            </form>
        </div>
    `;

    // Load item data if editing
    if (isEdit && itemId) {
        await loadItemForEdit(itemId);
    }

    // Attach form submit handler
    const form = document.getElementById('item-form');
    form.addEventListener('submit', handleFormSubmit);
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
                        <a href="#/items/edit/${itemId}" class="btn btn-primary">Edit</a>
                    </div>
                </div>

                <div class="item-view-body">
                    <div class="item-view-field">
                        <label class="item-view-label">Description</label>
                        <div id="view-item-description" class="item-view-value"></div>
                    </div>

                    <div class="item-view-meta">
                        <div class="item-view-field">
                            <label class="item-view-label">Item ID</label>
                            <div id="view-item-id" class="item-view-value-mono"></div>
                        </div>

                        <div class="item-view-field">
                            <label class="item-view-label">Created At</label>
                            <div id="view-item-created" class="item-view-value"></div>
                        </div>
                    </div>
                </div>
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
        document.getElementById('view-item-id').textContent = item.id;
        document.getElementById('view-item-created').textContent = formatDate(item.createdAt);

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
