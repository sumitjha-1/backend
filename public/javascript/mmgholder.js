window.itemOptions = window.itemOptions || {
  Electronics: ['Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Printer', 'Projector'],
  Stationery: ['Notebook', 'Pen', 'Pencil', 'Stapler', 'Highlighter', 'Sticky Notes'],
  Furniture: ['Chair', 'Table', 'Desk', 'Cabinet', 'Bookshelf', 'Filing Cabinet'],
  Tools: ['Screwdriver Set', 'Hammer', 'Wrench', 'Pliers', 'Drill Machine', 'Measuring Tape'],
  Cleaning: ['Broom', 'Mop', 'Dustpan', 'Cleaning Cloth', 'Disinfectant Spray', 'Trash Bags'],
  Miscellaneous: ['Whiteboard', 'Bulletin Board', 'First Aid Kit', 'Fire Extinguisher', 'Step Ladder', 'Toolbox']
};
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the dashboard
  setupNavigation();
  setupProfilePanel();
  setupStockForm();
  setupApproveModal();
  setupRejectModal();
  setupEventListeners();
  
  // Set today's date as default in date filters
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('.date-filter').forEach(filter => {
    filter.value = today;
  });

  // Load initial data
  loadInitialData();

  // Set first tab as active
  showSection('stockList');
  document.querySelector('.sidebar li').classList.add('active');
});

// Global variables
let currentUser = window.userData || {
  _id: 'dummy-user',
  userId: 'MMG001',
  name: 'Dummy User',
  email: 'dummy@company.com',
  designation: 'Inventory Manager',
  department: 'MMG',
  role: 'MMG_Inventory_Holder'
};

let currentEditingStockId = null;

// Setup functions
function setupNavigation() {
  // Hamburger menu toggle
  document.getElementById('hamburger').addEventListener('click', toggleSidebar);

  // Tab navigation
  document.querySelectorAll('.sidebar li').forEach(item => {
    item.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      showSection(target);
      
      // Update active tab
      document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
      this.classList.add('active');
      
      // Close sidebar on mobile
      if (window.innerWidth < 768) {
        document.getElementById('sidebar').style.display = 'none';
        document.querySelector('.content').classList.remove('with-sidebar');
      }
    });
  });
}

function setupProfilePanel() {
  // Profile button
  document.getElementById('profileBtn').addEventListener('click', function() {
    document.getElementById('profilePanel').classList.add('open');
  });

  // Close profile panel
  document.getElementById('closeProfile').addEventListener('click', function() {
    document.getElementById('profilePanel').classList.remove('open');
  });

  // Edit profile
  document.getElementById('editProfile').addEventListener('click', function() {
    document.querySelectorAll('.profile-fields input').forEach(input => {
      input.disabled = false;
    });
    document.getElementById('saveProfile').style.display = 'inline-block';
    this.style.display = 'none';
  });

  // Save profile
  document.getElementById('saveProfile').addEventListener('click', saveProfile);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
      window.location.href = '/logout';
    }
  });
}

function setupStockForm() {
  // Toggle stock form
  document.getElementById('toggleStockForm').addEventListener('click', function() {
    currentEditingStockId = null;
    document.getElementById('stockItemForm').reset();
    document.getElementById('stockItemName').innerHTML = '<option value="">--Select Type First--</option>';
    document.getElementById('stockFormModal').style.display = 'block';
  });

  // Close stock form
  document.getElementById('closeStockForm').addEventListener('click', function() {
    document.getElementById('stockFormModal').style.display = 'none';
  });

  // Cancel stock form
  document.getElementById('cancelStock').addEventListener('click', function() {
    document.getElementById('stockFormModal').style.display = 'none';
  });

  // Dynamic item selection for stock form - fixed version
  const typeSelect = document.getElementById('stockType');
  const itemNameSelect = document.getElementById('stockItemName');

  typeSelect.addEventListener('change', function() {
    const type = this.value;
    itemNameSelect.innerHTML = '<option value="">--Select Item--</option>';
    
    if (type && window.itemOptions[type]) {
      window.itemOptions[type].forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        itemNameSelect.appendChild(option);
      });
    }
  });

  // Submit stock form
  document.getElementById('stockItemForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const ledgerNo = this.elements.ledger.value.trim();
  if (!/^\d+$/.test(ledgerNo)) {
    showNotification('Ledger number must contain numbers only', 'error');
    return;
  }

  const formData = {
    ledgerNo: ledgerNo,
    name: this.elements.item.value,
    type: this.elements.type.value,
    quantity: parseInt(this.elements.quantity.value),
    department: 'MMG'
  };

  try {
    let endpoint = '/api/stock';
    let method = 'POST';
    
    if (currentEditingStockId) {
      endpoint = `/api/stock/${currentEditingStockId}`;
      method = 'PUT';
    }

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
      credentials: 'include' // Important for session cookies
    });

    // First check if response is HTML (error page)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('text/html') !== -1) {
      const html = await response.text();
      console.error('Received HTML instead of JSON:', html);
      throw new Error('Server returned HTML error page');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save stock item');
    }

    showNotification(currentEditingStockId ? 'Stock item updated successfully' : 'Stock item added successfully');
    this.reset();
    document.getElementById('stockFormModal').style.display = 'none';
    
    // Reload stock
    loadStockItems();
  } catch (err) {
    console.error('Error saving stock item:', err);
    showNotification(err.message || 'Failed to save stock item', 'error');
  }
});}

function setupApproveModal() {
  // Close approve modal
  document.getElementById('closeApproveModal').addEventListener('click', function() {
    document.getElementById('approveModal').style.display = 'none';
  });

  // Cancel approve modal
  document.getElementById('cancelApprove').addEventListener('click', function() {
    document.getElementById('approveModal').style.display = 'none';
  });

  // Submit approve form
  document.getElementById('approveForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
      requestId: this.elements.requestId.value,
      ledgerNo: this.elements.ledgerNo.value
    };

    try {
      const response = await fetch('/api/mmg-approve-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('Request approved successfully');
        document.getElementById('approveModal').style.display = 'none';
        
        // Reload data
        await Promise.all([loadRequests(), loadApprovedItems(), loadStockItems()]);
      } else {
        const error = await response.json();
        showNotification(error.error, 'error');
      }
    } catch (err) {
      console.error('Error approving request:', err);
      showNotification('Failed to approve request', 'error');
    }
  });
}

function setupRejectModal() {
  // Close reject modal
  document.getElementById('closeRejectModal').addEventListener('click', function() {
    document.getElementById('rejectModal').style.display = 'none';
  });

  // Cancel reject modal
  document.getElementById('cancelReject').addEventListener('click', function() {
    document.getElementById('rejectModal').style.display = 'none';
  });

  // Submit reject form
  document.getElementById('rejectForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
      requestId: this.elements.requestId.value,
      reason: this.elements.reason.value
    };

    try {
      const response = await fetch('/api/reject-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('Request rejected successfully');
        document.getElementById('rejectModal').style.display = 'none';
        loadRequests();
      } else {
        const error = await response.json();
        showNotification(error.error, 'error');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      showNotification('Failed to reject request', 'error');
    }
  });
}

function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      filterTable(target);
    });
  });

  // Search inputs (on Enter key)
  document.querySelectorAll('.search-input').forEach(input => {
    input.addEventListener('keyup', function(e) {
      if (e.key === 'Enter') {
        const section = this.closest('.tab-content');
        if (section) {
          const target = section.querySelector('tbody').id;
          filterTable(target);
        }
      }
    });
  });

  // Close modals when clicking outside
  window.addEventListener('click', function(e) {
    if (e.target === document.getElementById('stockFormModal')) {
      document.getElementById('stockFormModal').style.display = 'none';
    }
    if (e.target === document.getElementById('approveModal')) {
      document.getElementById('approveModal').style.display = 'none';
    }
    if (e.target === document.getElementById('rejectModal')) {
      document.getElementById('rejectModal').style.display = 'none';
    }
    if (e.target === document.getElementById('profilePanel')) {
      document.getElementById('profilePanel').classList.remove('open');
    }
  });
}

// Core functions
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.style.display = sidebar.style.display === 'block' ? 'none' : 'block';
  document.querySelector('.content').classList.toggle('with-sidebar');
}

function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show selected section
  document.getElementById(sectionId).classList.add('active');

  // Load data for the section
  switch(sectionId) {
    case 'stockList':
      loadStockItems();
      break;
    case 'requestList':
      loadRequests();
      break;
    case 'approvedList':
      loadApprovedItems();
      break;
    case 'returnList':
      loadReturnItems();
      break;
    case 'notificationList':
      loadNotifications();
      break;
  }
}

async function loadInitialData() {
  try {
    await Promise.all([
      loadStockItems(),
      loadRequests(),
      loadApprovedItems(),
      loadReturnItems(),
      loadNotifications()
    ]);
  } catch (error) {
    console.error('Error loading initial data:', error);
    showNotification('Failed to load initial data', 'error');
  }
}

// Data fetching functions
async function fetchStockItems() {
  try {
    const response = await fetch('/api/stock?department=MMG');
    if (!response.ok) throw new Error('Failed to fetch stock items');
    return await response.json();
  } catch (error) {
    console.error('Error fetching stock items:', error);
    return [];
  }
}

async function fetchRequests() {
  try {
    const response = await fetch('/api/mmg-pending-requests');
    if (!response.ok) throw new Error('Failed to fetch requests');
    return await response.json();
  } catch (error) {
    console.error('Error fetching requests:', error);
    return [];
  }
}

async function fetchApprovedItems() {
  try {
    const response = await fetch('/api/approved-items?returned=false');
    if (!response.ok) throw new Error('Failed to fetch approved items');
    return await response.json();
  } catch (error) {
    console.error('Error fetching approved items:', error);
    return [];
  }
}

async function fetchReturnItems() {
  try {
    const response = await fetch('/api/approved-items?returned=true');
    if (!response.ok) throw new Error('Failed to fetch return items');
    return await response.json();
  } catch (error) {
    console.error('Error fetching return items:', error);
    return [];
  }
}

async function fetchNotifications() {
  try {
    const response = await fetch('/api/notifications');
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return await response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

// Data loading functions
async function loadStockItems() {
  try {
    const stockItems = await fetchStockItems();
    renderStockItems(stockItems);
  } catch (err) {
    console.error('Error loading stock items:', err);
    document.getElementById('stockListError').textContent = 'Error loading stock items';
    document.getElementById('stockListError').style.display = 'block';
  }
}

async function loadRequests() {
  try {
    const requests = await fetchRequests();
    renderRequests(requests);
  } catch (err) {
    console.error('Error loading requests:', err);
    document.getElementById('requestListError').textContent = 'Error loading requests';
    document.getElementById('requestListError').style.display = 'block';
  }
}

async function loadApprovedItems() {
  try {
    const approvedItems = await fetchApprovedItems();
    renderApprovedItems(approvedItems);
  } catch (err) {
    console.error('Error loading approved items:', err);
    document.getElementById('approvedListError').textContent = 'Error loading approved items';
    document.getElementById('approvedListError').style.display = 'block';
  }
}

async function loadReturnItems() {
  try {
    const returnItems = await fetchReturnItems();
    renderReturnItems(returnItems);
  } catch (err) {
    console.error('Error loading return items:', err);
    document.getElementById('returnListError').textContent = 'Error loading return items';
    document.getElementById('returnListError').style.display = 'block';
  }
}

async function loadNotifications() {
  try {
    const notifications = await fetchNotifications();
    renderNotifications(notifications);
  } catch (err) {
    console.error('Error loading notifications:', err);
    document.getElementById('notificationListError').textContent = 'Error loading notifications';
    document.getElementById('notificationListError').style.display = 'block';
  }
}

// Render functions
function renderStockItems(stockItems) {
  const tbody = document.getElementById('stockListBody');
  tbody.innerHTML = '';
  
  if (!stockItems || stockItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-text">No stock items found</td></tr>';
    return;
  }
  
  stockItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo || '-'}</td>
      <td>${item.name}</td>
      <td>${item.type}</td>
      <td>${item.quantity}</td>
      <td>${new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
      <td>
        <button onclick="editStockItem('${item._id}')" class="edit-btn">Edit</button>
        <button onclick="deleteStockItem('${item._id}')" class="delete-btn">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderRequests(requests) {
  const tbody = document.getElementById('requestListBody');
  tbody.innerHTML = '';
  
  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-text">No pending requests found</td></tr>';
    return;
  }
  
  requests.forEach((request, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${request.requestedBy?.name || 'Unknown'}</td>
      <td>${request.department}</td>
      <td>${request.itemName}</td>
      <td>${request.type}</td>
      <td>${request.quantity}</td>
      <td>${new Date(request.departmentApprovalDate).toLocaleDateString()}</td>
      <td>${request.departmentApprovedBy?.name || 'Unknown'}</td>
      <td>
        <button onclick="showApproveModal('${request._id}', '${request.itemName}', '${request.requestedBy?.name || 'Unknown'}', '${request.department}', ${request.quantity})" class="btn-approve">Approve</button>
        <button onclick="showRejectModal('${request._id}', '${request.itemName}', '${request.requestedBy?.name || 'Unknown'}')" class="btn-reject">Reject</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderApprovedItems(approvedItems) {
  const tbody = document.getElementById('approvedListBody');
  tbody.innerHTML = '';
  
  if (!approvedItems || approvedItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text">No approved items found</td></tr>';
    return;
  }
  
  approvedItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo}</td>
      <td>${item.itemName}</td>
      <td>${item.type}</td>
      <td>${item.quantity}</td>
      <td>${item.issuedTo?.name || 'Unknown'}</td>
      <td>${item.department}</td>
      <td>${new Date(item.approvedDate).toLocaleDateString()}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderReturnItems(returnItems) {
  const tbody = document.getElementById('returnListBody');
  tbody.innerHTML = '';
  
  if (!returnItems || returnItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-text">No return requests found</td></tr>';
    return;
  }
  
  returnItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo}</td>
      <td>${item.itemName}</td>
      <td>${item.type}</td>
      <td>${item.issuedTo?.name || 'Unknown'}</td>
      <td>${item.department}</td>
      <td>${new Date(item.returnDate).toLocaleDateString()}</td>
      <td><button onclick="notifyUser('${item.issuedTo?._id}', '${item.itemName}')" class="btn-notify">Notify</button></td>
      <td><button onclick="addToStock('${item._id}')" class="btn-return">Add to Stock</button></td>
    `;
    tbody.appendChild(row);
  });
}

function renderNotifications(notifications) {
  const tbody = document.getElementById('notificationListBody');
  tbody.innerHTML = '';
  
  if (!notifications || notifications.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-text">No notifications found</td></tr>';
    return;
  }
  
  notifications.forEach((notification, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${notification.type}</td>
      <td>${notification.message}</td>
      <td>${new Date(notification.createdAt).toLocaleDateString()}</td>
      <td><span class="status-badge ${notification.status === 'Pending' ? 'status-pending' : 'status-approved'}">${notification.status}</span></td>
      <td>
        ${notification.status === 'Pending' ? 
          `<button onclick="markNotificationDone('${notification._id}')" class="mark-done-btn">Mark Done</button>` : 
          'Completed'}
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Action functions
function showApproveModal(requestId, itemName, requester, department, quantity) {
  document.getElementById('approveRequestId').value = requestId;
  document.getElementById('approveItemName').textContent = itemName;
  document.getElementById('approveRequester').textContent = requester;
  document.getElementById('approveDepartment').textContent = department;
  document.getElementById('approveQuantity').textContent = quantity;
  document.getElementById('approveModal').style.display = 'block';
}

function showRejectModal(requestId, itemName, requester) {
  document.getElementById('rejectRequestId').value = requestId;
  document.getElementById('rejectItemName').textContent = itemName;
  document.getElementById('rejectRequester').textContent = requester;
  document.getElementById('rejectModal').style.display = 'block';
}

async function notifyUser(userId, itemName) {
  if (confirm(`Send notification to user about returning ${itemName}?`)) {
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message: `Please return ${itemName} to the inventory`,
          type: 'Return Reminder'
        })
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('Notification sent successfully');
        loadNotifications();
      } else {
        const error = await response.json();
        showNotification(error.error, 'error');
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      showNotification('Failed to send notification', 'error');
    }
  }
}

async function addToStock(itemId) {
  if (confirm('Are you sure you want to add this item back to stock?')) {
    try {
      const response = await fetch('/api/add-to-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId })
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('Item added to stock successfully');
        await Promise.all([loadReturnItems(), loadStockItems()]);
      } else {
        const error = await response.json();
        showNotification(error.error, 'error');
      }
    } catch (err) {
      console.error('Error adding item to stock:', err);
      showNotification('Failed to add item to stock', 'error');
    }
  }
}

async function markNotificationDone(notificationId) {
  try {
    const response = await fetch('/api/mark-notification-done', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationId })
    });

    if (response.ok) {
      const data = await response.json();
      showNotification('Notification marked as done');
      loadNotifications();
    } else {
      const error = await response.json();
      showNotification(error.error, 'error');
    }
  } catch (err) {
    console.error('Error marking notification:', err);
    showNotification('Failed to update notification', 'error');
  }
}

async function editStockItem(itemId) {
  try {
    const response = await fetch(`/api/stock/${itemId}`);
    if (response.ok) {
      const item = await response.json();
      currentEditingStockId = itemId;
      
      // Populate form with item data
      document.getElementById('stockItemForm').elements.ledger.value = item.ledgerNo || '';
      document.getElementById('stockType').value = item.type || '';
      
      // Trigger change event to populate items
      const event = new Event('change');
      document.getElementById('stockType').dispatchEvent(event);
      
      // Wait a moment for the options to populate before setting the value
      setTimeout(() => {
        document.getElementById('stockItemName').value = item.name || '';
      }, 50);
      
      document.getElementById('stockItemForm').elements.quantity.value = item.quantity || 1;
      
      document.getElementById('stockFormModal').style.display = 'block';
    } else {
      throw new Error('Failed to fetch item');
    }
  } catch (error) {
    console.error('Error fetching stock item:', error);
    showNotification('Failed to load stock item for editing', 'error');
  }
}

async function deleteStockItem(itemId) {
  if (confirm('Are you sure you want to delete this item?')) {
    try {
      const response = await fetch(`/api/stock/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('Stock item deleted successfully');
        loadStockItems();
      } else {
        const error = await response.json();
        showNotification(error.error, 'error');
      }
    } catch (err) {
      console.error('Error deleting stock item:', err);
      showNotification('Failed to delete stock item', 'error');
    }
  }
}

async function saveProfile() {
  try {
    const formData = {
      name: document.getElementById('nameInput').value,
      email: document.getElementById('emailInput').value,
      dob: document.getElementById('dobInput').value,
      designation: document.getElementById('designationInput').value,
      password: document.getElementById('passwordInput').value
    };

    const response = await fetch('/api/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      const data = await response.json();
      document.querySelector('.user-name').textContent = data.user.name;
      document.querySelector('.user-title').textContent = `${data.user.designation}, ${data.user.department}`;
      
      document.querySelectorAll('.profile-fields input').forEach(input => {
        input.disabled = true;
      });
      document.getElementById('editProfile').style.display = 'inline-block';
      document.getElementById('saveProfile').style.display = 'none';
      
      showNotification('Profile updated successfully');
    } else {
      const error = await response.json();
      showNotification(error.error, 'error');
    }
  } catch (err) {
    console.error('Error saving profile:', err);
    showNotification('Failed to update profile', 'error');
  }
}

// Utility functions
function filterTable(tableId) {
  const prefix = tableId.replace('Body', '');
  const searchTerm = document.getElementById(`search${prefix}`).value.toLowerCase();
  const typeFilter = document.getElementById(`typeFilter${prefix}`).value;
  const dateFilter = document.getElementById(`dateFilter${prefix}`).value;
  const deptFilter = document.getElementById(`deptFilter${prefix}`)?.value || '';
  
  const rows = document.querySelectorAll(`#${tableId} tr`);
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const itemText = row.textContent.toLowerCase();
    const itemType = cells[3]?.textContent || cells[2]?.textContent || '';
    const itemDate = cells[4]?.textContent || cells[5]?.textContent || cells[6]?.textContent || '';
    const itemDept = cells[2]?.textContent || cells[5]?.textContent || '';
    
    const matchesSearch = searchTerm === '' || itemText.includes(searchTerm);
    const matchesType = typeFilter === '' || itemType === typeFilter;
    const matchesDate = dateFilter === '' || itemDate === dateFilter;
    const matchesDept = deptFilter === '' || itemDept === deptFilter;
    
    row.style.display = matchesSearch && matchesType && matchesDate && matchesDept ? '' : 'none';
  });
}

function showNotification(message, type = 'success') {
  const toast = document.getElementById('notificationToast');
  toast.textContent = message;
  toast.className = `notification-toast ${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Global exports
window.showApproveModal = showApproveModal;
window.showRejectModal = showRejectModal;
window.notifyUser = notifyUser;
window.addToStock = addToStock;
window.markNotificationDone = markNotificationDone;
window.editStockItem = editStockItem;
window.deleteStockItem = deleteStockItem;
window.filterTable = filterTable;