// DOM elements
const sidebar = document.getElementById('sidebar');
const content = document.querySelector('.content');
const profilePanel = document.getElementById('profilePanel');
const notificationBtn = document.getElementById('notificationBtn');
const notificationCount = document.getElementById('notificationCount');
const logoutBtn = document.getElementById('logoutBtn');
const editProfileBtn = document.getElementById('editProfile');
const saveProfileBtn = document.getElementById('saveProfile');

// Current user data
const userData = document.body.getAttribute('data-user');
let currentUser = userData ? JSON.parse(userData) : {
  _id: document.getElementById('currentUserId')?.value,
  name: document.getElementById('currentUserName')?.value,
  email: document.getElementById('currentUserEmail')?.value,
  role: document.getElementById('currentUserRole')?.value
};
window.itemOptions = {
  Electronics: ['Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Printer', 'Projector'],
  Stationery: ['Notebook', 'Pen', 'Pencil', 'Stapler', 'Highlighter', 'Sticky Notes'],
  Furniture: ['Chair', 'Table', 'Desk', 'Cabinet', 'Bookshelf', 'Filing Cabinet'],
  Tools: ['Screwdriver Set', 'Hammer', 'Wrench', 'Pliers', 'Drill Machine', 'Measuring Tape'],
  Cleaning: ['Broom', 'Mop', 'Dustpan', 'Cleaning Cloth', 'Disinfectant Spray', 'Trash Bags'],
  Miscellaneous: ['Whiteboard', 'Bulletin Board', 'First Aid Kit', 'Fire Extinguisher', 'Step Ladder', 'Toolbox']
};

// Global variables
let currentEditingStockId = null;
let unreadNotificationCount = 0;

// ======================
// INITIALIZATION
// ======================
document.addEventListener('DOMContentLoaded', function() {
  if (!currentUser || (currentUser.role !== 'Super_Admin' && currentUser.role !== 'Admin')) {
    window.location.href = '/';
    return;
  }

  setupEventListeners();
  loadInitialData();
  checkNotifications();
  setInterval(checkNotifications, 30000);
  showSection(currentUser.role === 'Super_Admin' ? 'userList' : 'myItems');
});

// ======================
// EVENT LISTENERS
// ======================
function setupEventListeners() {
  // Hamburger menu
  document.getElementById('hamburger').addEventListener('click', toggleSidebar);
  
  // Profile button
  document.getElementById('profileBtn').addEventListener('click', () => {
    profilePanel.classList.add('open');
  });
  
  // Close profile panel
  document.getElementById('closeProfile').addEventListener('click', () => {
    profilePanel.classList.remove('open');
  });
  
  // Navigation items
  document.querySelectorAll('.sidebar li').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      showSection(target);
      
      document.querySelectorAll('.sidebar li').forEach(li => {
        li.classList.remove('active');
      });
      item.classList.add('active');
    });
  });

  // Notification button
  notificationBtn.addEventListener('click', () => {
    showSection('notifications');
    markNotificationsAsRead();
  });

  // Request form handlers
  document.getElementById('requestItemBtn')?.addEventListener('click', () => {
  document.getElementById('requestFormModal').style.display = 'block';
});

  document.getElementById('closeRequestForm')?.addEventListener('click', () => {
    document.getElementById('requestFormModal').style.display = 'none';
  });

  document.getElementById('cancelRequest')?.addEventListener('click', () => {
    document.getElementById('requestFormModal').style.display = 'none';
  });

  // Item type change handler
  document.getElementById('itemType')?.addEventListener('change', function() {
    populateItemNames(this.value);
  });

  // Form submission handler
  document.getElementById('requestItemForm')?.addEventListener('submit', handleRequestSubmit);

  // Logout button
  logoutBtn.addEventListener('click', handleLogout);

  // Profile edit/save
  editProfileBtn.addEventListener('click', enableProfileEdit);
  saveProfileBtn.addEventListener('click', saveProfile);

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      filterTable(target);
    });
  });

  // Clear filter buttons
  document.querySelectorAll('.clear-filter-btn').forEach(button => {
    button.addEventListener('click', function() {
      const tabContent = this.closest('.tab-content');
      tabContent.querySelectorAll('input, select').forEach(input => {
        input.value = '';
      });
      const tableId = tabContent.querySelector('tbody').id;
      filterTable(tableId);
    });
  });

  // Search and filter inputs
  document.querySelectorAll('.search-input').forEach(input => {
    input.addEventListener('input', debounce(function(e) {
      const tableId = e.target.closest('.tab-content').querySelector('tbody').id;
      filterTable(tableId);
    }, 300));
  });

  document.querySelectorAll('.type-filter, .date-filter').forEach(select => {
    select.addEventListener('change', function(e) {
      const tableId = e.target.closest('.tab-content').querySelector('tbody').id;
      filterTable(tableId);
    });
  });

  // Download buttons
  document.getElementById('downloadUsersBtn')?.addEventListener('click', () => exportTableToExcel('userListBody', 'users'));
  document.getElementById('downloadStockBtn')?.addEventListener('click', () => exportTableToExcel('stockListBody', 'stock'));
  document.getElementById('downloadRequestsBtn')?.addEventListener('click', () => exportTableToExcel('requestListBody', 'requests'));
  document.getElementById('downloadApprovedBtn')?.addEventListener('click', () => exportTableToExcel('approvedListBody', 'approved_items'));
  document.getElementById('downloadMyStockBtn')?.addEventListener('click', () => exportTableToExcel('myStockListBody', 'my_stock'));
  document.getElementById('downloadMyRequestsBtn')?.addEventListener('click', () => exportTableToExcel('myRequestListBody', 'my_requests'));

  // Modal close buttons
  document.getElementById('closeRoleModal')?.addEventListener('click', () => {
    document.getElementById('roleModal').style.display = 'none';
  });
  document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
  document.getElementById('cancelRole')?.addEventListener('click', () => {
    document.getElementById('roleModal').style.display = 'none';
  });

  // Modal action buttons
  document.getElementById('saveRoleBtn')?.addEventListener('click', updateUserRole);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDeleteUser);
  document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);

  // Event delegation for dynamic elements
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('return-btn')) {
      const itemId = e.target.dataset.itemId;
      returnItem(itemId);
    }
    
    if (e.target.classList.contains('cancel-btn') || e.target.classList.contains('cancel-request-btn')) {
      const requestId = e.target.dataset.requestId;
      cancelRequest(requestId);
    }
    
    if (e.target.classList.contains('btn-role')) {
      const row = e.target.closest('tr');
      const userId = row.dataset.userId;
      const userName = row.dataset.userName;
      const userRole = row.dataset.userRole;
      showRoleModal(userId, userName, userRole);
    }
    
    if (e.target.classList.contains('delete-btn')) {
      const row = e.target.closest('tr');
      const userId = row.dataset.userId;
      const userName = row.dataset.userName;
      showDeleteModal(userId, userName);
    }
  });
}

// ======================
// NAVIGATION FUNCTIONS
// ======================
function toggleSidebar() {
  sidebar.style.display = sidebar.style.display === 'block' ? 'none' : 'block';
  content.classList.toggle('with-sidebar');
}

function showSection(id) {
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(id)?.classList.add('active');
  
  // Refresh data when switching tabs
  switch(id) {
    case 'myItems': 
      fetchAndRenderMyItems(); 
      break;
    case 'requestList': 
      fetchAndRenderRequests(); 
      break;
    case 'approvedItems': 
      fetchAndRenderApprovedItems(); 
      break;
    case 'returnList': 
      fetchAndRenderReturnList(); 
      break;
    case 'notifications': 
      fetchAndRenderNotifications(); 
      break;
    case 'userList': 
      fetchAndRenderUsers(); 
      break;
    case 'stockList': 
      fetchAndRenderStockItems(); 
      break;
    case 'myStockList':
      fetchAndRenderMyStockItems();
      break;
    case 'myRequestList':
      fetchAndRenderMyRequests();
      break;
  }
}

// ======================
// DATA LOADING FUNCTIONS
// ======================
function loadInitialData() {
  showLoadingState();
  
  const promises = [
    fetchAndRenderNotifications(),
    fetchAndRenderMyItems(),
    fetchAndRenderRequests(),
    fetchAndRenderApprovedItems(),
    fetchAndRenderReturnList()
  ];

  if (currentUser.role === 'Super_Admin') {
    promises.push(
      fetchAndRenderUsers(),
      fetchAndRenderStockItems(),
      fetchAndRenderMyStockItems(),
      fetchAndRenderMyRequests()
    );
  }

  Promise.all(promises)
    .catch(error => {
      console.error('Error loading initial data:', error);
      showToast('Failed to load initial data', 'error');
    })
    .finally(() => {
      hideLoadingState();
    });
}

// ======================
// REQUEST FORM FUNCTIONS
// ======================
async function populateItemNames(type) {
  const itemNameSelect = document.getElementById('itemName');
  itemNameSelect.innerHTML = '<option value="">--Select Item--</option>';
  
  if (!type) return;

  try {
    // First try to fetch from API
    const response = await fetch(`/api/stock/type/${type}`);
    if (response.ok) {
      const items = await response.json();
      items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        itemNameSelect.appendChild(option);
      });
      return; // Exit if API call succeeds
    }
  } catch (error) {
    console.error('API fetch error:', error);
    // Continue to fallback if API fails
  }

  // Fallback to window.itemOptions if API fails or isn't available
  if (window.itemOptions && window.itemOptions[type]) {
    window.itemOptions[type].forEach(item => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      itemNameSelect.appendChild(option);
    });
  }
}

async function handleRequestSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;
  
  // Disable button to prevent multiple submissions
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  
  const formData = {
    item: form.item.value,
    type: form.type.value,
    qty: parseInt(form.qty.value)
  };

  try {
    const response = await fetch('/api/request-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit request');
    }

    showToast(result.message || 'Request submitted successfully!', 'success');
    document.getElementById('requestFormModal').style.display = 'none';
    form.reset();
    
    // Refresh the requests list
    fetchAndRenderRequests();
    fetchAndRenderMyRequests();
  } catch (error) {
    console.error('Request submission error:', error);
    showToast(error.message || 'Failed to submit request', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
}

// ======================
// DATA FETCHING FUNCTIONS
// ======================
async function fetchAndRenderMyItems() {
  try {
    const response = await fetch('/api/my-items');
    if (!response.ok) throw new Error('Failed to fetch items');
    
    const items = await response.json();
    renderMyItems(items);
  } catch (error) {
    console.error('Error fetching my items:', error);
    showToast('Failed to load your items', 'error');
  }
}

async function fetchAndRenderRequests() {
  try {
    const response = await fetch('/api/requests');
    if (!response.ok) throw new Error('Failed to fetch requests');
    
    const requests = await response.json();
    renderRequests(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    showToast('Failed to load requests', 'error');
  }
}

async function fetchAndRenderApprovedItems() {
  try {
    const response = await fetch('/api/approved-items');
    if (!response.ok) throw new Error('Failed to fetch approved items');
    
    const items = await response.json();
    renderApprovedItems(items);
  } catch (error) {
    console.error('Error fetching approved items:', error);
    showToast('Failed to load approved items', 'error');
  }
}

async function fetchAndRenderReturnList() {
  try {
    const response = await fetch('/api/return-list');
    if (!response.ok) throw new Error('Failed to fetch return list');
    
    const items = await response.json();
    renderReturnList(items);
  } catch (error) {
    console.error('Error fetching return list:', error);
    showToast('Failed to load return list', 'error');
  }
}

async function fetchAndRenderNotifications() {
  try {
    const response = await fetch('/api/notifications');
    if (!response.ok) throw new Error('Failed to fetch notifications');
    
    const notifications = await response.json();
    renderNotifications(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    showToast('Failed to load notifications', 'error');
  }
}

async function fetchAndRenderUsers() {
  try {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error('Failed to fetch users');
    const users = await response.json();
    renderUsers(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    showToast('Failed to load users', 'error');
  }
}

async function fetchAndRenderStockItems() {
  try {
    const response = await fetch('/api/stock');
    if (!response.ok) throw new Error('Failed to fetch stock items');
    const stockItems = await response.json();
    renderStockItems(stockItems);
  } catch (error) {
    console.error('Error fetching stock items:', error);
    showToast('Failed to load stock items', 'error');
  }
}

async function fetchAndRenderMyStockItems() {
  try {
    const response = await fetch('/api/my-stock');
    if (!response.ok) throw new Error('Failed to fetch my stock items');
    const stockItems = await response.json();
    renderMyStockItems(stockItems);
  } catch (error) {
    console.error('Error fetching my stock items:', error);
    showToast('Failed to load my stock items', 'error');
  }
}

async function fetchAndRenderMyRequests() {
  try {
    const response = await fetch('/api/my-requests');
    if (!response.ok) throw new Error('Failed to fetch my requests');
    const requests = await response.json();
    renderMyRequests(requests);
  } catch (error) {
    console.error('Error fetching my requests:', error);
    showToast('Failed to load my requests', 'error');
  }
}

// ======================
// RENDERING FUNCTIONS
// ======================
function renderMyItems(items) {
  const tbody = document.getElementById('myItemsBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No items found</td></tr>';
    return;
  }
  
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo || '-'}</td>
      <td>${item.type}</td>
      <td>${item.itemName}</td>
      <td>${new Date(item.issueDate).toLocaleDateString()}</td>
      <td>${item.quantity}</td>
      <td>
        <button class="action-btn return-btn" data-item-id="${item._id}">Return</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderRequests(requests) {
  const tbody = document.getElementById('requestListBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">No requests found</td></tr>';
    return;
  }
  
  requests.forEach((request, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${request.itemName}</td>
      <td>${request.type}</td>
      <td>${request.quantity}</td>
      <td>${request.requestedBy?.name || 'Unknown'}</td>
      <td>${request.department}</td>
      <td>
        <span class="status-badge status-${request.status.toLowerCase().replace(' ', '-')}">
          ${request.status}
        </span>
      </td>
      <td>${new Date(request.createdAt).toLocaleDateString()}</td>
      <td>${request.ledgerNo || '-'}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderApprovedItems(items) {
  const tbody = document.getElementById('approvedItemsBody') || document.getElementById('approvedListBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">No approved items found</td></tr>';
    return;
  }
  
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.itemName}</td>
      <td>${item.type}</td>
      <td>${item.quantity}</td>
      <td>${item.issuedTo?.name || 'Unknown'}</td>
      <td>${item.department}</td>
      <td>${item.approvedBy?.name || 'Unknown'}</td>
      <td>${new Date(item.approvedDate).toLocaleDateString()}</td>
      <td>${item.ledgerNo}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderReturnList(items) {
  const tbody = document.getElementById('returnListBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No return requests found</td></tr>';
    return;
  }
  
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo || '-'}</td>
      <td>${item.type}</td>
      <td>${item.itemName}</td>
      <td>${new Date(item.returnDate).toLocaleDateString()}</td>
      <td>${item.quantity}</td>
      <td>
        <span class="status-badge status-${item.status.toLowerCase()}">
          ${item.status}
        </span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderNotifications(notifications) {
  const container = document.getElementById('notificationListBody') || document.getElementById('notificationList');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!notifications || notifications.length === 0) {
    container.innerHTML = '<tr><td colspan="4">No notifications found</td></tr>';
    return;
  }
  
  notifications.forEach((notification, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${notification.message}</td>
      <td>${new Date(notification.createdAt).toLocaleString()}</td>
      <td>${notification.status}</td>
    `;
    container.appendChild(row);
  });
}

function renderUsers(users) {
  const tbody = document.getElementById('userListBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8">No users found</td></tr>';
    return;
  }
  
  users.forEach((user, index) => {
    const row = document.createElement('tr');
    row.dataset.userId = user._id;
    row.dataset.userName = user.name;
    row.dataset.userRole = user.role;
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${user.name}</td>
      <td>${user.department}</td>
      <td>${user.designation}</td>
      <td>${user.email}</td>
      <td>
        <span class="role-badge role-${user.role.replace('_', '-')}">
          ${user.role.replace('_', ' ')}
        </span>
        ${user.is_active ? '' : ' (Inactive)'}
      </td>
      <td>
        <button class="btn-role">
          Change Role
        </button>
      </td>
      <td>
        <button class="delete-btn">
          🗑️
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderStockItems(stockItems) {
  const tbody = document.getElementById('stockListBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!stockItems || stockItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No stock items found</td></tr>';
    return;
  }
  
  stockItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.type}</td>
      <td>${item.ledgerNo || '-'}</td>
      <td>${item.department || 'MMG Department'}</td>
      <td>${item.quantity}</td>
      <td>${new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderMyStockItems(stockItems) {
  const tbody = document.getElementById('myStockListBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!stockItems || stockItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No stock items found in your department</td></tr>';
    return;
  }
  
  stockItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.type}</td>
      <td>${item.ledgerNo || '-'}</td>
      <td>${item.quantity}</td>
      <td>${new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderMyRequests(requests) {
  const tbody = document.getElementById('myRequestListBody') || document.getElementById('requestListBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8">No requests found</td></tr>';
    return;
  }
  
  requests.forEach((request, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${request.itemName}</td>
      <td>${request.type}</td>
      <td>${request.quantity}</td>
      <td>
        <span class="status-badge status-${request.status.toLowerCase().replace(' ', '-')}">
          ${request.status}
        </span>
        ${request.rejectionReason ? `<br><small>Reason: ${request.rejectionReason}</small>` : ''}
      </td>
      <td>${new Date(request.createdAt).toLocaleDateString()}</td>
      <td>${request.ledgerNo || '-'}</td>
      <td>
        ${request.status === 'Pending' ? 
          `<button class="cancel-request-btn" data-request-id="${request._id}">Cancel</button>` : 
          'N/A'}
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ======================
// ACTION FUNCTIONS
// ======================
async function returnItem(itemId) {
  if (!confirm('Are you sure you want to return this item?')) return;
  
  try {
    const response = await fetch(`/api/return-item/${itemId}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to return item');
    }
    
    const result = await response.json();
    showToast(result.message || 'Item returned successfully', 'success');
    fetchAndRenderMyItems();
    fetchAndRenderReturnList();
  } catch (error) {
    console.error('Return item error:', error);
    showToast(error.message || 'Failed to return item', 'error');
  }
}

async function cancelRequest(requestId) {
  if (!confirm('Are you sure you want to cancel this request?')) return;
  
  try {
    const response = await fetch(`/api/cancel-request/${requestId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel request');
    }
    
    showToast('Request cancelled successfully', 'success');
    fetchAndRenderRequests();
    fetchAndRenderMyRequests();
  } catch (error) {
    console.error('Cancel request error:', error);
    showToast(error.message || 'Failed to cancel request', 'error');
  }
}

// ======================
// USER MANAGEMENT FUNCTIONS
// ======================
function showRoleModal(userId, userName, currentRole) {
  document.getElementById('roleUserId').value = userId;
  document.getElementById('roleUserName').textContent = userName;
  document.getElementById('currentRole').textContent = currentRole;
  document.getElementById('roleSelect').value = currentRole;
  document.getElementById('roleModal').style.display = 'block';
}

function showDeleteModal(userId, userName) {
  document.getElementById('deleteUserName').textContent = userName;
  document.getElementById('deleteUserId').value = userId;
  document.getElementById('deleteUserModal').style.display = 'block';
}

function closeDeleteModal() {
  document.getElementById('deleteUserModal').style.display = 'none';
}

async function confirmDeleteUser() {
  const userId = document.getElementById('deleteUserId').value;
  
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to delete user');
    
    const result = await response.json();
    if (result.success) {
      closeDeleteModal();
      showToast('User deleted successfully', 'success');
      fetchAndRenderUsers();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showToast('Failed to delete user', 'error');
  }
}

async function updateUserRole() {
  const userId = document.getElementById('roleUserId').value;
  const newRole = document.getElementById('roleSelect').value;
  
  try {
    const response = await fetch(`/api/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    
    if (!response.ok) throw new Error('Failed to update user role');
    
    const result = await response.json();
    if (result.success) {
      document.getElementById('roleModal').style.display = 'none';
      showToast('User role updated successfully', 'success');
      fetchAndRenderUsers();
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    showToast('Failed to update user role', 'error');
  }
}

// ======================
// NOTIFICATION FUNCTIONS
// ======================
async function checkNotifications() {
  try {
    const response = await fetch('/api/notifications/unread-count');
    if (!response.ok) throw new Error('Failed to fetch notification count');
    
    const data = await response.json();
    unreadNotificationCount = data.count || 0;
    
    if (unreadNotificationCount > 0) {
      notificationCount.textContent = unreadNotificationCount;
      notificationCount.style.display = 'inline-block';
    } else {
      notificationCount.style.display = 'none';
    }
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}

async function markNotificationsAsRead() {
  try {
    const response = await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to mark notifications as read');
    notificationCount.style.display = 'none';
    unreadNotificationCount = 0;
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}

// ======================
// PROFILE FUNCTIONS
// ======================
function enableProfileEdit() {
  document.querySelectorAll('.profile-fields input').forEach(input => {
    input.disabled = false;
  });
  editProfileBtn.style.display = 'none';
  saveProfileBtn.style.display = 'inline-block';
}

async function saveProfile() {
  const name = document.getElementById('nameInput').value;
  const email = document.getElementById('emailInput').value;
  const dob = document.getElementById('dobInput').value;
  const designation = document.getElementById('designationInput').value;
  const password = document.getElementById('passwordInput').value;
  
  try {
    const updateData = { name, email, dob, designation };
    if (password) {
      updateData.password = password;
    }
    
    const response = await fetch('/api/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }
    
    const result = await response.json();
    document.querySelectorAll('.profile-fields input').forEach(input => {
      input.disabled = true;
    });
    editProfileBtn.style.display = 'inline-block';
    saveProfileBtn.style.display = 'none';
    
    // Update current user data
    if (result.user) {
      currentUser = { ...currentUser, ...result.user };
      document.body.setAttribute('data-user', JSON.stringify(currentUser));
      document.querySelector('.welcome-msg').textContent = `Welcome, ${currentUser.name}`;
      document.querySelector('.user-name').textContent = currentUser.name;
    }
    
    showToast('Profile updated successfully', 'success');
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast(error.message || 'Failed to update profile', 'error');
  }
}

// ======================
// FILTER FUNCTIONS
// ======================
function filterTable(tableId) {
  const tabContent = document.getElementById(tableId.replace('Body', ''))?.closest('.tab-content');
  if (!tabContent) return;
  
  const rows = document.querySelectorAll(`#${tableId} tr`);
  const headerRow = tabContent.querySelector('thead tr');

  // Get filter values
  const searchName = tabContent.querySelector(`#searchName${tableId.replace('Body', '')}`)?.value.toLowerCase() || '';
  const typeFilter = tabContent.querySelector(`#typeFilter${tableId.replace('Body', '')}`)?.value || '';
  const deptFilter = tabContent.querySelector(`#deptFilter${tableId.replace('Body', '')}`)?.value || '';
  const roleFilter = tabContent.querySelector(`#roleFilter${tableId.replace('Body', '')}`)?.value || '';
  const statusFilter = tabContent.querySelector(`#statusFilter${tableId.replace('Body', '')}`)?.value || '';
  const dateFilter = tabContent.querySelector(`#dateFilter${tableId.replace('Body', '')}`)?.value || '';

  rows.forEach(row => {
    if (!row.cells || row.cells.length === 0) return;
    
    const cells = row.cells;
    let shouldShow = true;

    // Name/Item search
    if (searchName && !cells[1]?.textContent.toLowerCase().includes(searchName)) {
      shouldShow = false;
    }

    // Type filter
    if (typeFilter) {
      const typeIndex = Array.from(headerRow.cells).findIndex(cell => 
        cell.textContent.trim().toLowerCase() === 'type'
      );
      if (typeIndex >= 0 && cells[typeIndex]?.textContent !== typeFilter) {
        shouldShow = false;
      }
    }

    // Department filter
    if (deptFilter) {
      const deptIndex = Array.from(headerRow.cells).findIndex(cell => 
        cell.textContent.trim().toLowerCase() === 'department'
      );
      if (deptIndex >= 0 && cells[deptIndex]?.textContent !== deptFilter) {
        shouldShow = false;
      }
    }

    // Role filter
    if (roleFilter) {
      const roleIndex = Array.from(headerRow.cells).findIndex(cell => 
        cell.textContent.trim().toLowerCase().includes('role')
      );
      if (roleIndex >= 0 && !cells[roleIndex]?.textContent.includes(roleFilter)) {
        shouldShow = false;
      }
    }

    // Status filter
    if (statusFilter) {
      const statusIndex = Array.from(headerRow.cells).findIndex(cell => 
        cell.textContent.trim().toLowerCase() === 'status'
      );
      if (statusIndex >= 0 && !cells[statusIndex]?.textContent.includes(statusFilter)) {
        shouldShow = false;
      }
    }

    // Date filter
    if (dateFilter) {
      const dateIndex = Array.from(headerRow.cells).findIndex(cell => 
        cell.textContent.trim().toLowerCase() === 'date'
      );
      if (dateIndex >= 0) {
        const cellDate = new Date(cells[dateIndex].textContent).toISOString().split('T')[0];
        const filterDate = new Date(dateFilter).toISOString().split('T')[0];
        if (cellDate !== filterDate) {
          shouldShow = false;
        }
      }
    }

    row.style.display = shouldShow ? '' : 'none';
  });
}

// ======================
// EXCEL EXPORT FUNCTION
// ======================
function exportTableToExcel(tableId, fileName) {
  try {
    const table = document.getElementById(tableId);
    const tabContent = table.closest('.tab-content');
    const headerRow = tabContent.querySelector('thead tr');
    const rows = table.querySelectorAll('tr:not([style*="display: none"])');
    
    // Prepare CSV content
    let csvContent = [];
    
    // Add headers
    const headers = [];
    headerRow.querySelectorAll('th').forEach(th => {
      headers.push(`"${th.textContent.trim().replace(/"/g, '""')}"`);
    });
    csvContent.push(headers.join(','));
    
    // Add data rows
    rows.forEach(row => {
      const rowData = [];
      row.querySelectorAll('td').forEach(td => {
        rowData.push(`"${td.textContent.trim().replace(/"/g, '""')}"`);
      });
      csvContent.push(rowData.join(','));
    });

    // Create download link
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Excel file downloaded successfully', 'success');
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    showToast('Failed to export data', 'error');
  }
}

// ======================
// UTILITY FUNCTIONS
// ======================
function showToast(message, type) {
  const toast = document.getElementById('notificationToast');
  toast.textContent = message;
  toast.className = `notification-toast ${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function showLoadingState() {
  document.querySelectorAll('.tab-content').forEach(section => {
    const loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.innerHTML = '<div class="spinner"></div>';
    section.appendChild(loader);
  });
}

function hideLoadingState() {
  document.querySelectorAll('.loading-overlay').forEach(loader => {
    loader.remove();
  });
}

function debounce(func, timeout = 300) {
  let timer;
  return function(...args) {
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(context, args);
    }, timeout);
  };
}

async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    try {
      const response = await fetch('/logout', { method: 'GET' });
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  }
}