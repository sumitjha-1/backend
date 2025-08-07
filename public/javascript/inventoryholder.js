// Current user data from EJS template
const currentUser = {
  _id: '<%= user._id %>',
  userId: '<%= user.userId %>',
  name: '<%= user.name %>',
  email: '<%= user.email %>',
  designation: '<%= user.designation %>',
  department: '<%= user.department %>',
  role: '<%= user.role %>'
};

// Item options configuration
window.itemOptions = {
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
  setupRequestForm();
  setupEventListeners();
  
  // Set today's date as default in date filters
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('.date-filter').forEach(filter => {
    filter.value = today;
  });

  // Load initial data
  loadInitialData();

  // Set first tab as active
  showSection('userList');
  document.querySelector('.sidebar li').classList.add('active');
});

// Setup functions
function setupNavigation() {
  // Hamburger menu toggle
  document.getElementById('hamburger').addEventListener('click', toggleSidebar);

  // Tab navigation
  document.querySelectorAll('.sidebar li').forEach(item => {
    item.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      showSection(target);
      
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
    document.getElementById('editProfile').style.display = 'none';
    document.getElementById('saveProfile').style.display = 'inline-block';
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

function setupRequestForm() {
  // Toggle request form
  document.getElementById('toggleRequestForm')?.addEventListener('click', function() {
    document.getElementById('requestFormContainer').classList.toggle('active');
  });

  // Cancel request
  document.getElementById('cancelRequest')?.addEventListener('click', function() {
    document.getElementById('requestFormContainer').classList.remove('active');
    document.getElementById('requestItemForm').reset();
  });

  // Dynamic item selection
  document.getElementById('itemType')?.addEventListener('change', function() {
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

  // Submit request
  const requestForm = document.getElementById('requestItemForm');
  if (requestForm) {
    requestForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const itemName = document.getElementById('itemName').value.trim();
      const type = document.getElementById('itemType').value.trim();
      const quantity = parseInt(document.getElementById('itemQty').value);
      const priority = document.getElementById('itemPriority').value;

      if (!itemName || !type || isNaN(quantity) || quantity < 1) {
        showNotification('Please fill all fields with valid values', 'error');
        return;
      }

      try {
        const response = await fetch('/api/request-item', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemName,
            type,
            quantity,
            priority
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit request');
        }

        const data = await response.json();
        showNotification(`Request submitted successfully for ${quantity} ${itemName}(s)`);
        
        // Reset form and close
        this.reset();
        document.getElementById('requestFormContainer').classList.remove('active');
        
        // Reload requests
        loadMyRequests();
      } catch (err) {
        console.error('Request submission error:', err);
        showNotification(err.message || 'Failed to submit request', 'error');
      }
    });
  }
}

function setupEventListeners() {
  // Event delegation for all dynamic buttons
  document.addEventListener('click', function(e) {
    // View user items
    if (e.target.classList.contains('view-items-btn')) {
      const userId = e.target.dataset.userid;
      const userName = e.target.dataset.username;
      viewUserItems(userId, userName);
    }
    
    // Approve requests
    if (e.target.classList.contains('approve-btn')) {
      const requestId = e.target.dataset.requestid;
      approveRequest(requestId);
    }
    
    // Reject requests
    if (e.target.classList.contains('reject-btn')) {
      const requestId = e.target.dataset.requestid;
      showRejectModal(requestId);
    }
    
    // Request return
    if (e.target.classList.contains('request-return-btn')) {
      const itemId = e.target.dataset.itemid;
      requestReturn(itemId);
    }
    
    // Notify user about return
    if (e.target.classList.contains('notify-btn')) {
      const userId = e.target.dataset.userid;
      const itemName = e.target.dataset.itemname;
      notifyUser(userId, itemName);
    }
    
    // Complete return
    if (e.target.classList.contains('complete-btn')) {
      const itemId = e.target.dataset.itemid;
      completeReturn(itemId);
    }
    
    // Mark notification as done
    if (e.target.classList.contains('mark-done-btn')) {
      const notificationId = e.target.dataset.notificationid;
      markNotificationDone(notificationId);
    }
    
    // Edit stock item
    if (e.target.classList.contains('edit-btn')) {
      const itemId = e.target.dataset.itemid;
      editStockItem(itemId);
    }
    
    // Cancel request
    if (e.target.classList.contains('cancel-btn')) {
      const requestId = e.target.dataset.id;
      cancelRequest(requestId);
    }

    // Filter buttons
    if (e.target.classList.contains('filter-btn')) {
      const target = e.target.dataset.target;
      filterTable(target);
    }

    // Export buttons
    if (e.target.classList.contains('export-btn')) {
      const target = e.target.dataset.target;
      exportToExcel(target);
    }

    // Close modals
    if (e.target.id === 'closeApprovalModal' || e.target.id === 'cancelApproval') {
      document.getElementById('approvalModal').style.display = 'none';
    }
    if (e.target.id === 'closeRejectModal' || e.target.id === 'cancelReject') {
      document.getElementById('rejectModal').style.display = 'none';
    }
    if (e.target.id === 'btnConfirmReject') {
      rejectRequest();
    }
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
    if (e.target === document.getElementById('profilePanel')) {
      document.getElementById('profilePanel').classList.remove('open');
    }
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
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
    case 'userList':
      loadUsers();
      break;
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
    case 'myStock':
      loadMyStock();
      break;
    case 'myRequests':
      loadMyRequests();
      break;
  }
}

async function loadInitialData() {
  try {
    showLoading();
    await Promise.all([
      loadUsers(),
      loadStockItems(),
      loadRequests(),
      loadApprovedItems(),
      loadReturnItems(),
      loadNotifications(),
      loadMyStock(),
      loadMyRequests()
    ]);
  } catch (error) {
    console.error('Error loading initial data:', error);
    showNotification('Failed to load initial data', 'error');
  } finally {
    hideLoading();
  }
}

// Data fetching functions
async function loadUsers() {
  try {
    const response = await fetch(`/api/department-users?department=${currentUser.department}`);
    if (!response.ok) throw new Error('Failed to fetch users');
    const users = await response.json();
    renderUsers(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    showError('userListError', 'Failed to load users. Please try again.');
  }
}

async function loadStockItems() {
  try {
    const response = await fetch(`/api/stock?department=${currentUser.department}`);
    if (!response.ok) throw new Error('Failed to fetch stock items');
    const stockItems = await response.json();
    renderStockItems(stockItems);
  } catch (error) {
    console.error('Error fetching stock items:', error);
    showError('stockListError', 'Failed to load stock items. Please try again.');
  }
}

async function loadRequests() {
  try {
    const response = await fetch(`/api/department-requests?department=${currentUser.department}`);
    if (!response.ok) throw new Error('Failed to fetch requests');
    const requests = await response.json();
    renderRequests(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    showError('requestListError', 'Failed to load requests. Please try again.');
  }
}

async function loadApprovedItems() {
  try {
    const response = await fetch(`/api/approved-items?department=${currentUser.department}`);
    if (!response.ok) throw new Error('Failed to fetch approved items');
    const approvedItems = await response.json();
    renderApprovedItems(approvedItems);
  } catch (error) {
    console.error('Error fetching approved items:', error);
    showError('approvedListError', 'Failed to load approved items. Please try again.');
  }
}

async function loadReturnItems() {
  try {
    const response = await fetch(`/api/return-items?department=${currentUser.department}`);
    if (!response.ok) throw new Error('Failed to fetch return items');
    const returnItems = await response.json();
    renderReturnItems(returnItems);
  } catch (error) {
    console.error('Error fetching return items:', error);
    showError('returnListError', 'Failed to load return items. Please try again.');
  }
}

async function loadNotifications() {
  try {
    const response = await fetch('/api/notifications');
    if (!response.ok) throw new Error('Failed to fetch notifications');
    const notifications = await response.json();
    renderNotifications(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    showError('notificationListError', 'Failed to load notifications. Please try again.');
  }
}

async function loadMyStock() {
  try {
    showLoading('myStockBody');
    const response = await fetch('/api/my-stock');
    if (!response.ok) throw new Error('Failed to load stock');
    const stock = await response.json();
    renderMyStock(stock);
  } catch (err) {
    console.error('Error loading stock:', err);
    showError('myStockBody', err.message || 'Error loading stock');
  }
}

async function loadMyRequests() {
  try {
    showLoading('myRequestsBody');
    const response = await fetch('/api/my-requests');
    if (!response.ok) throw new Error('Failed to load requests');
    const requests = await response.json();
    renderMyRequests(requests);
  } catch (err) {
    console.error('Error loading requests:', err);
    showError('myRequestsBody', err.message || 'Error loading requests');
  }
}

async function fetchUserItems(userId) {
  try {
    const response = await fetch(`/api/user-items/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user items');
    return await response.json();
  } catch (error) {
    console.error('Error fetching user items:', error);
    return [];
  }
}

// Render functions
function renderUsers(users) {
  const tbody = document.getElementById('userListBody');
  tbody.innerHTML = '';
  
  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-text">No users found in your department</td></tr>';
    return;
  }
  
  users.forEach((user, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${user.name}</td>
      <td>${user.designation}</td>
      <td>${user.email}</td>
      <td>
        <button class="view-items-btn" data-userid="${user._id}" data-username="${user.name}">View Items</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderStockItems(stockItems) {
  const tbody = document.getElementById('stockListBody');
  tbody.innerHTML = '';
  
  if (!stockItems || stockItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text">No stock items found in your department</td></tr>';
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
      <td>${item.issuedTo?.name || 'None'}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderRequests(requests) {
  const tbody = document.getElementById('requestListBody');
  tbody.innerHTML = '';
  
  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-text">No pending requests in your department</td></tr>';
    return;
  }
  
  requests.forEach((request, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${request.requestedBy?.name || 'Unknown'}</td>
      <td>${request.requestedBy?.designation || '-'}</td>
      <td>${request.itemName}</td>
      <td>${request.type}</td>
      <td>${request.quantity}</td>
      
      <td>${new Date(request.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="approve-btn" data-requestid="${request._id}">Approve</button>
        <button class="reject-btn" data-requestid="${request._id}">Reject</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderApprovedItems(approvedItems) {
  const tbody = document.getElementById('approvedListBody');
  tbody.innerHTML = '';
  
  if (!approvedItems || approvedItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-text">No approved items in your department</td></tr>';
    return;
  }
  
  approvedItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo || '-'}</td>
      <td>${item.itemName}</td>
      <td>${item.type}</td>
      <td>${item.quantity}</td>
      <td>${item.issuedTo?.name || 'Unknown'}</td>
      <td><span class="status-badge ${item.status === 'Issued' ? 'completed' : 'pending'}">${item.status || 'Issued'}</span></td>
      <td>${new Date(item.approvedDate).toLocaleDateString()}</td>
      <td>
        <button class="notify-btn" data-userid="${item.issuedTo?._id}" data-itemname="${item.itemName}">Notify</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderReturnItems(returnItems) {
  const tbody = document.getElementById('returnListBody');
  tbody.innerHTML = '';
  
  if (!returnItems || returnItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="loading-text">No return requests in your department</td></tr>';
    return;
  }
  
  returnItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo || '-'}</td>
      <td>${item.itemName}</td>
      <td>${item.type}</td>
      <td>${item.issuedTo?.name || 'Unknown'}</td>
      <td>${item.issuedTo?.designation || '-'}</td>
      <td>${new Date(item.returnDate).toLocaleDateString()}</td>
      <td>
        <button class="notify-btn" data-userid="${item.issuedTo?._id}" data-itemname="${item.itemName}">Notify</button>
      </td>
      <td>
        <button class="complete-btn" data-itemid="${item._id}">Complete</button>
      </td>
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
      <td>
        <span class="status-badge ${notification.status === 'Pending' ? 'pending' : 'completed'}">
          ${notification.status}
        </span>
      </td>
      <td>
        ${notification.status === 'Pending' ? 
          `<button class="mark-done-btn" data-notificationid="${notification._id}">Mark Done</button>` : 
          'Completed'}
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderMyStock(stock) {
  const tbody = document.getElementById('myStockBody');
  tbody.innerHTML = '';
  
  if (!stock || stock.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-text">No stock items found</td></tr>';
    return;
  }
  
  stock.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo || '-'}</td>
      <td>${item.name}</td>
      <td>${item.type}</td>
      <td>${item.quantity}</td>
      <td>${new Date(item.updatedAt).toLocaleDateString()}</td>
      <td>
        <button class="request-return-btn" data-itemid="${item._id}">Request Return</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderMyRequests(requests) {
  const tbody = document.getElementById('myRequestsBody');
  tbody.innerHTML = '';
  
  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text">No requests found</td></tr>';
    return;
  }
  
  requests.forEach((request, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${request.type}</td>
      <td>${request.itemName}</td>
      <td>${new Date(request.createdAt).toLocaleDateString()}</td>
      <td>${request.quantity}</td>
      <td><span class="status-badge ${request.status.toLowerCase()}">${request.status}</span></td>
      <td>
        ${request.status === 'Pending' ? 
          `<button class="cancel-btn action-btn" data-id="${request._id}">Cancel</button>` : 
          ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Action functions
async function viewUserItems(userId, userName) {
  try {
    showLoading();
    const items = await fetchUserItems(userId);
    const userItemsSection = document.getElementById('userItemsSection');
    const userNameHeading = document.getElementById('userNameHeading');
    const userItemsBody = document.getElementById('userItemsBody');
    
    userNameHeading.textContent = userName;
    userNameHeading.dataset.userId = userId;
    userItemsBody.innerHTML = '';
    
    if (items && items.length > 0) {
      items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${item.itemName}</td>
          <td>${item.type}</td>
          <td>${new Date(item.approvedDate).toLocaleDateString()}</td>
          <td>${item.quantity}</td>
          <td>
            <button class="request-return-btn" data-itemid="${item._id}">Request Return</button>
          </td>
        `;
        userItemsBody.appendChild(row);
      });
    } else {
      userItemsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No items issued to this user</td></tr>';
    }
    
    userItemsSection.style.display = 'block';
  } catch (error) {
    console.error('Error viewing user items:', error);
    showNotification('Failed to load user items', 'error');
  } finally {
    hideLoading();
  }
}

async function approveRequest(requestId) {
  if (!confirm('Are you sure you want to approve this request? It will be sent to MMG for final approval.')) return;
  
  try {
    showLoading();
    const response = await fetch('/api/department-approve-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve request');
    }
    
    const result = await response.json();
    showNotification('Request approved and sent to MMG for final approval');
    
    // Reload both requests and approved items
    await Promise.all([loadRequests(), loadApprovedItems(), loadNotifications()]);
  } catch (error) {
    console.error('Error approving request:', error);
    showNotification(error.message || 'Failed to approve request', 'error');
  } finally {
    hideLoading();
  }
}

function showRejectModal(requestId) {
  document.getElementById('rejectRequestId').value = requestId;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectModal').style.display = 'block';
}

async function rejectRequest() {
  const requestId = document.getElementById('rejectRequestId').value;
  const reason = document.getElementById('rejectReason').value;
  
  if (!reason) {
    showNotification('Please enter a rejection reason', 'error');
    return;
  }

  try {
    showLoading();
    const response = await fetch('/api/reject-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId, reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject request');
    }
    
    const result = await response.json();
    document.getElementById('rejectModal').style.display = 'none';
    showNotification('Request rejected successfully');
    
    // Reload requests
    await loadRequests();
  } catch (error) {
    console.error('Error rejecting request:', error);
    showNotification(error.message || 'Failed to reject request', 'error');
  } finally {
    hideLoading();
  }
}

async function requestReturn(itemId) {
  if (!confirm('Are you sure you want to request return of this item?')) return;
  
  try {
    showLoading();
    const response = await fetch('/api/request-return', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ itemId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to request return');
    }
    
    const result = await response.json();
    showNotification('Return request submitted successfully');
    
    // Reload user items
    const currentUserId = document.getElementById('userNameHeading').dataset.userId;
    if (currentUserId) {
      await viewUserItems(currentUserId, document.getElementById('userNameHeading').textContent);
    }
  } catch (error) {
    console.error('Error requesting return:', error);
    showNotification(error.message || 'Failed to request return', 'error');
  } finally {
    hideLoading();
  }
}

async function notifyUser(userId, itemName) {
  if (!confirm(`Send notification to user about returning ${itemName}?`)) return;
  
  try {
    showLoading();
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send notification');
    }
    
    const result = await response.json();
    showNotification('Notification sent successfully');
    
    // Reload notifications
    await loadNotifications();
  } catch (error) {
    console.error('Error sending notification:', error);
    showNotification(error.message || 'Failed to send notification', 'error');
  } finally {
    hideLoading();
  }
}

async function completeReturn(itemId) {
  if (!confirm('Are you sure you want to complete this return?')) return;
  
  try {
    showLoading();
    const response = await fetch('/api/complete-return', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ itemId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete return');
    }
    
    const result = await response.json();
    showNotification('Return completed successfully');
    
    // Reload return items and stock
    await Promise.all([loadReturnItems(), loadStockItems()]);
  } catch (error) {
    console.error('Error completing return:', error);
    showNotification(error.message || 'Failed to complete return', 'error');
  } finally {
    hideLoading();
  }
}

async function markNotificationDone(notificationId) {
  try {
    showLoading();
    const response = await fetch('/api/mark-notification-done', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark notification as done');
    }
    
    const result = await response.json();
    showNotification('Notification marked as done');
    
    // Reload notifications
    await loadNotifications();
  } catch (error) {
    console.error('Error marking notification:', error);
    showNotification(error.message || 'Failed to update notification', 'error');
  } finally {
    hideLoading();
  }
}

async function editStockItem(itemId) {
  try {
    showLoading();
    const response = await fetch(`/api/stock/${itemId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch stock item');
    }
    
    const item = await response.json();
    showNotification('Edit functionality would be implemented here');
  } catch (error) {
    console.error('Error fetching stock item:', error);
    showNotification(error.message || 'Failed to load stock item for editing', 'error');
  } finally {
    hideLoading();
  }
}

async function cancelRequest(requestId) {
  if (!requestId || !confirm('Are you sure you want to cancel this request?')) {
    return;
  }

  try {
    const response = await fetch(`/api/cancel-request/${requestId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel request');
    }

    showNotification('Request cancelled successfully');
    loadMyRequests();
  } catch (err) {
    console.error('Error cancelling request:', err);
    showNotification(err.message || 'Failed to cancel request', 'error');
  }
}

async function saveProfile() {
  try {
    showLoading();
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }
    
    const result = await response.json();
    document.querySelectorAll('.profile-fields input').forEach(input => {
      input.disabled = true;
    });
    document.getElementById('editProfile').style.display = 'inline-block';
    document.getElementById('saveProfile').style.display = 'none';
    
    // Update profile display
    document.querySelector('.user-name').textContent = formData.name;
    document.querySelector('.user-title').textContent = `${formData.designation}, ${currentUser.department}`;
    
    showNotification('Profile updated successfully');
  } catch (error) {
    console.error('Error saving profile:', error);
    showNotification(error.message || 'Failed to update profile', 'error');
  } finally {
    hideLoading();
  }
}

// Utility functions
function filterTable(tableId) {
  const prefix = tableId.replace('Body', '');
  const searchTerm = document.getElementById(`search${prefix}`)?.value.toLowerCase() || '';
  const typeFilter = document.getElementById(`typeFilter${prefix}`)?.value || '';
  const dateFilter = document.getElementById(`dateFilter${prefix}`)?.value || '';
  let statusFilter = '';
  let desgFilter = '';
  let priorityFilter = '';
  
  // Get additional filters based on table
  if (tableId === 'myRequestsBody') {
    statusFilter = document.getElementById(`statusFilter${prefix}`)?.value || '';
    priorityFilter = document.getElementById(`priorityFilter${prefix}`)?.value || '';
  } else if (tableId === 'userListBody') {
    desgFilter = document.getElementById(`desgFilter${prefix}`)?.value || '';
    statusFilter = document.getElementById(`statusFilter${prefix}`)?.value || '';
  } else if (tableId === 'stockListBody') {
    statusFilter = document.getElementById(`statusFilter${prefix}`)?.value || '';
  }
  
  const rows = document.querySelectorAll(`#${tableId} tr`);
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return;
    
    const itemText = row.textContent.toLowerCase();
    let itemType = '';
    let itemDate = '';
    let itemStatus = '';
    let itemDesg = '';
    let itemPriority = '';
    
    // Get cell values based on table structure
    if (tableId === 'myStockBody') {
      itemType = cells[3]?.textContent || '';
      itemDate = cells[5]?.textContent || '';
    } else if (tableId === 'myRequestsBody') {
      itemType = cells[1]?.textContent || '';
      itemPriority = cells[2]?.textContent || '';
      itemDate = cells[3]?.textContent || '';
      itemStatus = cells[5]?.textContent || '';
    } else if (tableId === 'userListBody') {
      itemDesg = cells[2]?.textContent || '';
      itemStatus = cells[4]?.textContent || '';
    } else if (tableId === 'stockListBody') {
      itemType = cells[3]?.textContent || '';
      itemStatus = cells[5]?.textContent || '';
    } else if (tableId === 'requestListBody') {
      itemType = cells[4]?.textContent || '';
      itemPriority = cells[6]?.textContent || '';
      itemDate = cells[7]?.textContent || '';
    } else if (tableId === 'approvedListBody') {
      itemType = cells[3]?.textContent || '';
      itemStatus = cells[6]?.textContent || '';
      itemDate = cells[7]?.textContent || '';
    } else if (tableId === 'returnListBody') {
      itemType = cells[3]?.textContent || '';
      itemStatus = cells[6]?.textContent || '';
      itemDate = cells[7]?.textContent || '';
    } else if (tableId === 'notificationListBody') {
      itemType = cells[1]?.textContent || '';
      itemStatus = cells[4]?.textContent || '';
      itemDate = cells[3]?.textContent || '';
    }
    
    const matchesSearch = searchTerm === '' || itemText.includes(searchTerm);
    const matchesType = typeFilter === '' || itemType === typeFilter;
    const matchesDate = dateFilter === '' || itemDate === dateFilter;
    const matchesStatus = statusFilter === '' || itemStatus === statusFilter;
    const matchesDesg = desgFilter === '' || itemDesg === desgFilter;
    const matchesPriority = priorityFilter === '' || itemPriority === priorityFilter;
    
    if (tableId === 'myRequestsBody') {
      row.style.display = matchesSearch && matchesType && matchesDate && matchesStatus && matchesPriority ? '' : 'none';
    } else if (tableId === 'userListBody') {
      row.style.display = matchesSearch && matchesDesg && matchesStatus ? '' : 'none';
    } else if (tableId === 'stockListBody') {
      row.style.display = matchesSearch && matchesType && matchesStatus ? '' : 'none';
    } else if (tableId === 'requestListBody') {
      row.style.display = matchesSearch && matchesType && matchesPriority ? '' : 'none';
    } else {
      row.style.display = matchesSearch && matchesType && matchesStatus ? '' : 'none';
    }
  });
}

function exportToExcel(tableId) {
  try {
    const table = document.querySelector(`#${tableId}`).closest('table');
    if (!table) {
      showNotification('No table found to export', 'error');
      return;
    }

    // Get all rows
    const rows = table.querySelectorAll('tr');
    if (rows.length <= 1) {
      showNotification('No data to export', 'warning');
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Get headers
    const headers = [];
    table.querySelectorAll('th').forEach(th => {
      headers.push(th.textContent.trim());
    });
    
    // Get data rows
    const data = [];
    rows.forEach((row, index) => {
      if (index === 0) return; // skip header row
      
      const rowData = {};
      row.querySelectorAll('td').forEach((td, colIndex) => {
        // Skip action columns
        if (!td.querySelector('button')) {
          rowData[headers[colIndex]] = td.textContent.trim();
        }
      });
      if (Object.keys(rowData).length > 0) {
        data.push(rowData);
      }
    });
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    
    // Generate file and download
    const fileName = `${tableId.replace('Body', '')}_export_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showNotification('Excel file downloaded successfully');
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Failed to export data', 'error');
  }
}

function showLoading() {
  document.querySelectorAll('.tab-content').forEach(section => {
    const loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.innerHTML = '<div class="spinner"></div>';
    section.appendChild(loader);
  });
}

function hideLoading() {
  document.querySelectorAll('.loading-overlay').forEach(loader => {
    loader.remove();
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

function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  } else {
    showNotification(message, 'error');
  }
}