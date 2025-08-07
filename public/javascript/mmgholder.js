
window.itemOptions = window.itemOptions || {
  Electronics: ['Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Printer', 'Projector'],
  Stationery: ['Notebook', 'Pen', 'Pencil', 'Stapler', 'Highlighter', 'Sticky Notes'],
  Furniture: ['Chair', 'Table', 'Desk', 'Cabinet', 'Bookshelf', 'Filing Cabinet'],
  Tools: ['Screwdriver Set', 'Hammer', 'Wrench', 'Pliers', 'Drill Machine', 'Measuring Tape'],
  Cleaning: ['Broom', 'Mop', 'Dustpan', 'Cleaning Cloth', 'Disinfectant Spray', 'Trash Bags'],
  Miscellaneous: ['Whiteboard', 'Bulletin Board', 'First Aid Kit', 'Fire Extinguisher', 'Step Ladder', 'Toolbox']
};// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Setup all components
  setupNavigation();
  setupProfilePanel();
  setupStockForm();
  setupApproveModal();
  setupRejectModal();
  setupRequestForm();
  setupEventListeners();
  
  // Set default date filters to today
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('.date-filter').forEach(filter => {
    filter.value = today;
  });

  // Load initial data
  loadInitialData();

  // Activate first tab
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

// ======================
// SETUP FUNCTIONS
// ======================

function setupNavigation() {
  document.getElementById('hamburger').addEventListener('click', toggleSidebar);
  document.querySelectorAll('.sidebar li').forEach(item => {
    item.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      showSection(target);
      document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
      this.classList.add('active');
      if (window.innerWidth < 768) {
        document.getElementById('sidebar').style.display = 'none';
        document.querySelector('.content').classList.remove('with-sidebar');
      }
    });
  });
}

function setupProfilePanel() {
  document.getElementById('profileBtn').addEventListener('click', function() {
    document.getElementById('profilePanel').classList.add('open');
  });
  document.getElementById('closeProfile').addEventListener('click', function() {
    document.getElementById('profilePanel').classList.remove('open');
  });
  document.getElementById('editProfile').addEventListener('click', function() {
    document.querySelectorAll('.profile-fields input').forEach(input => {
      input.disabled = false;
    });
    document.getElementById('saveProfile').style.display = 'inline-block';
    this.style.display = 'none';
  });
  document.getElementById('saveProfile').addEventListener('click', saveProfile);
  document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
      window.location.href = '/logout';
    }
  });
}

function setupRequestForm() {
  const toggleRequestForm = document.getElementById('toggleRequestForm');
  if (toggleRequestForm) {
    toggleRequestForm.addEventListener('click', function() {
      document.getElementById('requestFormModal').style.display = 'block';
    });
  }
  
  document.getElementById('closeRequestForm').addEventListener('click', function() {
    document.getElementById('requestFormModal').style.display = 'none';
  });
  
  document.getElementById('cancelRequest').addEventListener('click', function() {
    document.getElementById('requestFormModal').style.display = 'none';
  });
  
  const itemTypeSelect = document.getElementById('itemType');
  if (itemTypeSelect) {
    itemTypeSelect.addEventListener('change', function() {
      const type = this.value;
      const itemNameSelect = document.getElementById('itemName');
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
  }
  
  const requestForm = document.getElementById('requestItemForm');
  if (requestForm) {
    requestForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const itemName = document.getElementById('itemName').value.trim();
      const type = document.getElementById('itemType').value.trim();
      const quantity = parseInt(document.getElementById('itemQty').value);
      
      if (!itemName || !type || isNaN(quantity) || quantity < 1) {
        showNotification('Please fill all fields with valid values', 'error');
        return;
      }
      
      if (!window.itemOptions[type] || !window.itemOptions[type].includes(itemName)) {
        showNotification(`"${itemName}" is not a valid item for type "${type}"`, 'error');
        return;
      }
      
      const formData = {
        itemName,
        type,
        quantity
      };
      
      try {
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
        
        const response = await fetch('/api/request-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit request');
        }
        
        showNotification(`Request submitted successfully for ${quantity} ${itemName}(s)`);
        this.reset();
        document.getElementById('requestFormModal').style.display = 'none';
        loadMyRequests();
        loadRequests();
      } catch (err) {
        console.error('Request submission error:', err);
        showNotification(err.message || 'Failed to submit request', 'error');
      }
    });
  }
}

function setupStockForm() {
  document.getElementById('toggleStockForm').addEventListener('click', function() {
    currentEditingStockId = null;
    document.getElementById('stockItemForm').reset();
    document.getElementById('stockItemName').innerHTML = '<option value="">--Select Type First--</option>';
    document.getElementById('stockFormModal').style.display = 'block';
  });
  
  document.getElementById('closeStockForm').addEventListener('click', function() {
    document.getElementById('stockFormModal').style.display = 'none';
  });
  
  document.getElementById('cancelStock').addEventListener('click', function() {
    document.getElementById('stockFormModal').style.display = 'none';
  });
  
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
      department: this.elements.department.value
    };
    
    try {
      let endpoint = '/api/add-stock';
      let method = 'POST';
      
      if (currentEditingStockId) {
        endpoint = `/api/stock/${currentEditingStockId}`;
        method = 'PUT';
      }
      
      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      
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
      loadStockItems();
    } catch (err) {
      console.error('Error saving stock item:', err);
      showNotification(err.message || 'Failed to save stock item', 'error');
    }
  });
}

function setupApproveModal() {
  document.getElementById('closeApproveModal').addEventListener('click', function() {
    document.getElementById('approveModal').style.display = 'none';
  });
  
  document.getElementById('cancelApprove').addEventListener('click', function() {
    document.getElementById('approveModal').style.display = 'none';
  });
  
  document.getElementById('approveForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = {
      requestId: this.elements.requestId.value,
      ledgerNo: this.elements.ledgerNo.value,
      approvedBy: currentUser._id
    };
    
    try {
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Approving...';
      
      const response = await fetch('/api/mmg-approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve request');
      }
      
      showNotification('Request approved successfully');
      document.getElementById('approveModal').style.display = 'none';
      await Promise.all([loadRequests(), loadApprovedItems(), loadStockItems()]);
    } catch (err) {
      console.error('Error approving request:', err);
      showNotification(err.message || 'Failed to approve request', 'error');
    }
  });
}

function setupRejectModal() {
  document.getElementById('closeRejectModal').addEventListener('click', function() {
    document.getElementById('rejectModal').style.display = 'none';
  });
  
  document.getElementById('cancelReject').addEventListener('click', function() {
    document.getElementById('rejectModal').style.display = 'none';
  });
  
  document.getElementById('rejectForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = {
      requestId: this.elements.requestId.value,
      reason: this.elements.reason.value,
      rejectedBy: currentUser._id
    };
    
    try {
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rejecting...';
      
      const response = await fetch('/api/reject-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject request');
      }
      
      showNotification('Request rejected successfully');
      document.getElementById('rejectModal').style.display = 'none';
      loadRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      showNotification(err.message || 'Failed to reject request', 'error');
    }
  });
}

function setupEventListeners() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      filterTable(target);
    });
  });
  
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
    if (e.target === document.getElementById('requestFormModal')) {
      document.getElementById('requestFormModal').style.display = 'none';
    }
    if (e.target === document.getElementById('profilePanel')) {
      document.getElementById('profilePanel').classList.remove('open');
    }
  });
}

// ======================
// UTILITY FUNCTIONS
// ======================

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.style.display = sidebar.style.display === 'block' ? 'none' : 'block';
  document.querySelector('.content').classList.toggle('with-sidebar');
}

function showSection(sectionId) {
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(sectionId).classList.add('active');
  
  // Load data for the active section
  switch(sectionId) {
    case 'stockList':
      loadStockItems();
      break;
    case 'requestList':
      loadRequests();
      break;
    case 'myRequests':
      loadMyRequests();
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
    case 'myStock':
      loadMyStock();
      break;
  }
}

async function loadInitialData() {
  try {
    await Promise.all([
      loadStockItems(),
      loadRequests(),
      loadMyRequests(),
      loadApprovedItems(),
      loadReturnItems(),
      loadNotifications(),
      loadMyStock()
    ]);
  } catch (error) {
    console.error('Error loading initial data:', error);
    showNotification('Failed to load initial data', 'error');
  }
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

// ======================
// DATA FETCHING FUNCTIONS
// ======================

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

async function fetchMyRequests() {
  try {
    const response = await fetch('/api/my-requests');
    if (!response.ok) throw new Error('Failed to fetch my requests');
    return await response.json();
  } catch (error) {
    console.error('Error fetching my requests:', error);
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

async function fetchMyStock() {
  try {
    const response = await fetch('/api/my-stock');
    if (!response.ok) throw new Error('Failed to fetch my stock items');
    return await response.json();
  } catch (error) {
    console.error('Error fetching my stock items:', error);
    return [];
  }
}

// ======================
// DATA LOADING FUNCTIONS
// ======================

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

async function loadMyRequests() {
  try {
    const requests = await fetchMyRequests();
    renderMyRequests(requests);
  } catch (err) {
    console.error('Error loading my requests:', err);
    const errorElement = document.getElementById('myRequestsError');
    if (errorElement) {
      errorElement.textContent = 'Error loading my requests';
      errorElement.style.display = 'block';
    } else {
      showNotification('Error loading my requests', 'error');
    }
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

async function loadMyStock() {
  try {
    const myStockItems = await fetchMyStock();
    renderMyStock(myStockItems);
  } catch (err) {
    console.error('Error loading my stock items:', err);
    document.getElementById('myStockError').textContent = 'Error loading my stock items';
    document.getElementById('myStockError').style.display = 'block';
  }
}

// ======================
// RENDERING FUNCTIONS
// ======================

function renderStockItems(stockItems) {
  const tbody = document.getElementById('stockListBody');
  tbody.innerHTML = '';
  
  if (!stockItems || stockItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text">No stock items found</td></tr>';
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
      <td>${item.department || 'MMG'}</td>
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
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text">No pending requests found</td></tr>';
    return;
  }
  
  requests.forEach((request, index) => {
    const row = document.createElement('tr');
    row.dataset.requestId = request._id;
    row.dataset.itemName = request.itemName;
    row.dataset.requestedBy = request.requestedBy?.name || 'Unknown';
    row.dataset.department = request.department;
    row.dataset.quantity = request.quantity;
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${request.requestedBy?.name || 'Unknown'}</td>
      <td>${request.department}</td>
      <td>${request.itemName}</td>
      <td>${request.type}</td>
      <td>${request.quantity}</td>
      <td>${new Date(request.departmentApprovalDate).toLocaleDateString()}</td>
      <td>
        <button onclick="showApproveModal('${request._id}', '${request.itemName}', '${request.requestedBy?.name || 'Unknown'}', '${request.department}', ${request.quantity})" class="btn-approve">Approve</button>
        <button onclick="showRejectModal('${request._id}', '${request.itemName}', '${request.requestedBy?.name || 'Unknown'}')" class="btn-reject">Reject</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderMyRequests(requests) {
  const tbody = document.getElementById('myRequestsBody');
  tbody.innerHTML = '';
  
  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-text">No requests found</td></tr>';
    return;
  }
  
  requests.forEach((request, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${request.type}</td>
      <td>${request.itemName}</td>
      <td>${new Date(request.requestDate).toLocaleDateString()}</td>
      <td>${request.quantity}</td>
      <td><span class="status-badge status-${request.status.toLowerCase()}">${request.status}${request.reason ? `<br><small>Reason: ${request.reason}</small>` : ''}</span></td>
      <td>
        ${request.status === 'Pending' ? 
          `<button onclick="cancelRequest('${request._id}')" class="btn-reject">Cancel</button>` : 
          '-'}
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

function renderMyStock(myStockItems) {
  const tbody = document.getElementById('myStockBody');
  tbody.innerHTML = '';
  
  if (!myStockItems || myStockItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-text">No stock items found</td></tr>';
    return;
  }
  
  myStockItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo || '-'}</td>
      <td>${item.itemName}</td>
      <td>${item.type}</td>
      <td>${item.quantity}</td>
      <td>${new Date(item.issueDate).toLocaleDateString()}</td>
      <td>
        <button onclick="returnItem('${item._id}')" class="btn-return">Return</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ======================
// ACTION FUNCTIONS
// ======================

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message: `Please return ${itemName} to the inventory`,
          type: 'Return Reminder'
        })
      });
      
      if (response.ok) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });
      
      if (response.ok) {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId })
    });
    
    if (response.ok) {
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
      const form = document.getElementById('stockItemForm');
      
      form.elements.ledger.value = item.ledgerNo || '';
      form.elements.department.value = item.department || 'MMG';
      form.elements.type.value = item.type || '';
      
      // Trigger change event to populate items
      const event = new Event('change');
      document.getElementById('stockType').dispatchEvent(event);
      
      // Small delay to ensure options are populated
      setTimeout(() => {
        form.elements.item.value = item.name || '';
      }, 50);
      
      form.elements.quantity.value = item.quantity || 1;
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

async function cancelRequest(requestId) {
  if (confirm('Are you sure you want to cancel this request?')) {
    try {
      const response = await fetch(`/api/cancel-request/${requestId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        showNotification('Request cancelled successfully');
        loadMyRequests();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to cancel request', 'error');
      }
    } catch (err) {
      console.error('Error cancelling request:', err);
      showNotification('Failed to cancel request', 'error');
    }
  }
}

async function returnItem(itemId) {
  if (confirm('Are you sure you want to return this item?')) {
    try {
      const response = await fetch('/api/return-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });
      
      if (response.ok) {
        showNotification('Item return requested successfully');
        await Promise.all([loadMyStock(), loadReturnItems()]);
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to request return', 'error');
      }
    } catch (err) {
      console.error('Error requesting return:', err);
      showNotification('Failed to request return', 'error');
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
      headers: { 'Content-Type': 'application/json' },
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
      document.getElementById('passwordInput').value = '';
      
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

function filterTable(tableId) {
  const prefix = tableId.replace('Body', '');
  const searchInput = document.getElementById(`search${prefix}`);
  const typeFilter = document.getElementById(`typeFilter${prefix}`);
  const dateFilter = document.getElementById(`dateFilter${prefix}`);
  const deptFilter = document.getElementById(`deptFilter${prefix}`);
  const statusFilter = document.getElementById(`statusFilter${prefix}`);
  
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const typeValue = typeFilter ? typeFilter.value : '';
  const dateValue = dateFilter ? dateFilter.value : '';
  const deptValue = deptFilter ? deptFilter.value : '';
  const statusValue = statusFilter ? statusFilter.value : '';
  
  const rows = document.querySelectorAll(`#${tableId} tr`);
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 1) return; // Skip loading/empty rows
    
    let rowText = '';
    let itemType = '';
    let itemDate = '';
    let itemDept = '';
    let itemStatus = '';
    let itemQty = '';
    let itemName = '';
    
    // Extract relevant data based on table structure
    cells.forEach((cell, index) => {
      const header = document.querySelector(`#${tableId.replace('Body', '')} th:nth-child(${index+1})`);
      if (header) {
        const headerText = header.textContent.toLowerCase();
        rowText += cell.textContent.toLowerCase() + ' ';
        
        if (headerText.includes('type')) itemType = cell.textContent;
        if (headerText.includes('date')) itemDate = cell.textContent;
        if (headerText.includes('department') || headerText.includes('dept')) itemDept = cell.textContent;
        if (headerText.includes('status')) itemStatus = cell.textContent;
        if (headerText.includes('qty') || headerText.includes('quantity')) itemQty = cell.textContent;
        if (headerText.includes('name') || headerText.includes('item')) itemName = cell.textContent;
      }
    });
    
    // Apply filters
    const matchesSearch = searchTerm === '' || rowText.includes(searchTerm);
    const matchesType = typeValue === '' || itemType === typeValue;
    const matchesDate = dateValue === '' || itemDate.includes(dateValue);
    const matchesDept = deptValue === '' || itemDept === deptValue;
    const matchesStatus = statusValue === '' || itemStatus === statusValue;
    const matchesQty = !searchTerm || isNaN(parseInt(searchTerm)) || itemQty.includes(searchTerm);
    const matchesName = !searchTerm || itemName.toLowerCase().includes(searchTerm);
    
    row.style.display = matchesSearch && matchesType && matchesDate && matchesDept && 
                       matchesStatus && matchesQty && matchesName ? '' : 'none';
  });
}

function exportToExcel(tableID, filename) {
  const table = document.getElementById(tableID);
  if (!table) {
    showNotification('No data to export', 'error');
    return;
  }

  // Create HTML string for table
  let html = '<table>';
  
  // Add headers (skip department headers)
  const headers = table.closest('.tab-content').querySelectorAll('thead th');
  html += '<tr>';
  headers.forEach(header => {
    if (!header.classList.contains('department-header')) {
      html += `<th>${header.textContent}</th>`;
    }
  });
  html += '</tr>';
  
  // Add rows (only visible rows)
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    if (row.style.display !== 'none') {
      html += '<tr>';
      row.querySelectorAll('td').forEach((cell, index) => {
        // Skip columns that match department headers
        if (!headers[index] || !headers[index].classList.contains('department-header')) {
          // Remove buttons from exported data
          const content = cell.querySelector('button') ? '' : cell.textContent;
          html += `<td>${content}</td>`;
        }
      });
      html += '</tr>';
    }
  });
  
  html += '</table>';
  
  // Create download link
  const blob = new Blob([html], {type: 'application/vnd.ms-excel'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showNotification(`Exported data to ${filename}.xls`);
}

// ======================
// GLOBAL EXPORTS
// ======================

window.showApproveModal = showApproveModal;
window.showRejectModal = showRejectModal;
window.notifyUser = notifyUser;
window.addToStock = addToStock;
window.markNotificationDone = markNotificationDone;
window.editStockItem = editStockItem;
window.deleteStockItem = deleteStockItem;
window.cancelRequest = cancelRequest;
window.returnItem = returnItem;
window.filterTable = filterTable;
window.exportToExcel = exportToExcel;