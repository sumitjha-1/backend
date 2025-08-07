// Get user data from body attribute
const userDataJson = document.body.getAttribute('data-user') || '{}';
window.userData = JSON.parse(userDataJson);

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
});

function setupNavigation() {
  // Hamburger menu toggle
  document.getElementById('hamburger').addEventListener('click', function() {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.display = sidebar.style.display === 'block' ? 'none' : 'block';
    document.querySelector('.content').classList.toggle('with-sidebar');
  });

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
  document.getElementById('saveProfile').addEventListener('click', async function() {
    const formData = {
      name: document.getElementById('nameInput').value.trim(),
      email: document.getElementById('emailInput').value.trim(),
      dob: document.getElementById('dobInput').value,
      designation: document.getElementById('designationInput').value.trim(),
      department: document.getElementById('departmentInput').value.trim(),
      password: document.getElementById('passwordInput').value
    };

    // Client-side validation
    if (!formData.name || !formData.email || !formData.designation || !formData.department) {
      showNotification('Please fill all required fields', 'error');
      return;
    }

    try {
      const response = await fetch('/api/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        document.querySelector('.user-name').textContent = data.user.name;
        document.querySelector('.user-title').textContent = `${data.user.designation}, ${data.user.department}`;
        
        document.querySelectorAll('.profile-fields input').forEach(input => {
          input.disabled = true;
        });
        document.getElementById('editProfile').style.display = 'inline-block';
        this.style.display = 'none';
        
        showNotification('Profile updated successfully');
      } else {
        showNotification(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      showNotification('Failed to update profile. Please try again.', 'error');
    }
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
      window.location.href = '/logout';
    }
  });
}

function setupRequestForm() {
  // Toggle request form
  const toggleRequestForm = document.getElementById('toggleRequestForm');
  if (toggleRequestForm) {
    toggleRequestForm.addEventListener('click', function() {
      document.getElementById('requestFormModal').style.display = 'block';
    });
  }

  // Close request form
  const closeRequestForm = document.getElementById('closeRequestForm');
  if (closeRequestForm) {
    closeRequestForm.addEventListener('click', function() {
      document.getElementById('requestFormModal').style.display = 'none';
    });
  }

  // Cancel request
  const cancelRequestBtn = document.getElementById('cancelRequest');
  if (cancelRequestBtn) {
    cancelRequestBtn.addEventListener('click', function() {
      document.getElementById('requestFormModal').style.display = 'none';
    });
  }

  // Dynamic item selection
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

  // Submit request - Fixed version with proper validation
  const requestForm = document.getElementById('requestItemForm');
  if (requestForm) {
    requestForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Get form values
      const itemName = document.getElementById('itemName').value.trim();
      const type = document.getElementById('itemType').value.trim();
      const quantity = parseInt(document.getElementById('itemQty').value);

      // Client-side validation
      if (!itemName || !type || isNaN(quantity) || quantity < 1) {
        showNotification('Please fill all fields with valid values', 'error');
        return;
      }

      // Verify item is valid for the selected type
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
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';

        const response = await fetch('/api/request-item', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });

        // Restore button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit request');
        }

        const data = await response.json();
        showNotification(`Request submitted successfully for ${quantity} ${itemName}(s)`);
        
        // Reset form and close modal
        this.reset();
        document.getElementById('requestFormModal').style.display = 'none';
        
        // Reload requests
        loadRequests();
      } catch (err) {
        console.error('Request submission error:', err);
        showNotification(err.message || 'Failed to submit request', 'error');
      }
    });
  }
}

function setupEventListeners() {
  // Return buttons
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('return-btn')) {
      const itemId = e.target.getAttribute('data-id');
      returnItem(itemId);
    }
    
    if (e.target.classList.contains('cancel-btn')) {
      const requestId = e.target.getAttribute('data-id');
      cancelRequest(requestId);
    }

    if (e.target.classList.contains('mark-done-btn')) {
      const notificationId = e.target.getAttribute('data-id');
      markNotificationDone(notificationId);
    }

    // Handle approve/reject buttons for inventory holders
    if (e.target.classList.contains('approve-btn')) {
      const requestId = e.target.getAttribute('data-id');
      approveRequest(requestId);
    }

    if (e.target.classList.contains('reject-btn')) {
      const requestId = e.target.getAttribute('data-id');
      const reason = prompt('Please enter the reason for rejection:');
      if (reason) {
        rejectRequest(requestId, reason);
      }
    }

    // Export buttons
    if (e.target.classList.contains('export-btn')) {
      const target = e.target.getAttribute('data-target');
      exportToExcel(target);
    }
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      if (target === 'notificationList') {
        filterNotifications();
      } else {
        filterTable(target);
      }
    });
  });

  // Reset filter buttons
  document.querySelectorAll('.reset-filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      resetFilters(target);
    });
  });

  // Search inputs (on Enter key)
  document.querySelectorAll('.search-input').forEach(input => {
    input.addEventListener('keyup', function(e) {
      if (e.key === 'Enter') {
        const section = this.closest('.tab-content');
        if (section) {
          const target = section.querySelector('tbody')?.id || 'notificationList';
          if (target === 'notificationList') {
            filterNotifications();
          } else {
            filterTable(target);
          }
        }
      }
    });
  });

  // Close modals when clicking outside
  window.addEventListener('click', function(e) {
    if (e.target === document.getElementById('requestFormModal')) {
      document.getElementById('requestFormModal').style.display = 'none';
    }
    if (e.target === document.getElementById('profilePanel')) {
      document.getElementById('profilePanel').classList.remove('open');
    }
  });
}

function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show selected section
  const activeSection = document.getElementById(sectionId);
  if (activeSection) {
    activeSection.classList.add('active');
  }

  // Load data for the section
  switch(sectionId) {
    case 'myItems':
      loadMyItems();
      break;
    case 'requestList':
      loadRequests();
      break;
    case 'approvedItems':
      loadApprovedItems();
      break;
    case 'returnList':
      loadReturnItems();
      break;
    case 'notifications':
      loadNotifications();
      break;
  }
}

async function loadInitialData() {
  try {
    await Promise.all([
      loadMyItems(),
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

async function loadMyItems() {
  try {
    showLoading('myItemsBody');
    const response = await fetch('/api/user-items');
    if (!response.ok) {
      throw new Error('Failed to load items');
    }
    const items = await response.json();
    renderMyItems(items);
  } catch (err) {
    console.error('Error loading items:', err);
    showError('myItemsBody', err.message || 'Error loading your items');
  }
}

function renderMyItems(items) {
  const tbody = document.getElementById('myItemsBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-text">No items issued to you</td></tr>';
    return;
  }
  
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo}</td>
      <td>${item.type}</td>
      <td>${item.itemName}</td>
      <td>${formatDate(item.approvedDate)}</td>
      <td>${item.quantity}</td>
      <td>
        ${!item.returned ? 
          `<button class="return-btn action-btn" data-id="${item._id}">Return</button>` : 
          '<span class="status-returned">Returned</span>'}
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function loadRequests() {
  try {
    showLoading('requestListBody');
    const response = await fetch('/api/user-requests');
    if (!response.ok) {
      throw new Error('Failed to load requests');
    }
    const requests = await response.json();
    renderRequests(requests);
  } catch (err) {
    console.error('Error loading requests:', err);
    showError('requestListBody', err.message || 'Error loading requests');
  }
}

function renderRequests(requests) {
  const tbody = document.getElementById('requestListBody');
  if (!tbody) return;
  
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
      <td>${formatDate(request.createdAt)}</td>
      <td>${request.quantity}</td>
      <td><span class="status-badge status-${request.status.toLowerCase()}">${request.status}</span></td>
      <td>
        ${request.status === 'Pending' ? 
          `<button class="cancel-btn action-btn" data-id="${request._id}">Cancel</button>` : 
          ''}
        ${request.status === 'Department Approved' ? 
          `<span class="text-muted">Waiting for MMG approval</span>` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function loadApprovedItems() {
  try {
    showLoading('approvedItemsBody');
    const response = await fetch('/api/user-approved-items');
    if (!response.ok) {
      throw new Error('Failed to load approved items');
    }
    const items = await response.json();
    renderApprovedItems(items);
  } catch (err) {
    console.error('Error loading approved items:', err);
    showError('approvedItemsBody', err.message || 'Error loading approved items');
  }
}

function renderApprovedItems(items) {
  const tbody = document.getElementById('approvedItemsBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-text">No approved items found</td></tr>';
    return;
  }
  
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo}</td>
      <td>${item.type}</td>
      <td>${item.itemName}</td>
      <td>${formatDate(item.approvedDate)}</td>
      <td>${item.quantity}</td>
    `;
    tbody.appendChild(row);
  });
}

async function loadReturnItems() {
  try {
    showLoading('returnListBody');
    const response = await fetch('/api/user-return-items');
    if (!response.ok) {
      throw new Error('Failed to load return items');
    }
    const items = await response.json();
    renderReturnItems(items);
  } catch (err) {
    console.error('Error loading return items:', err);
    showError('returnListBody', err.message || 'Error loading return items');
  }
}

function renderReturnItems(items) {
  const tbody = document.getElementById('returnListBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-text">No return requests found</td></tr>';
    return;
  }
  
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.ledgerNo}</td>
      <td>${item.type}</td>
      <td>${item.itemName}</td>
      <td>${formatDate(item.returnDate)}</td>
      <td>${item.quantity}</td>
      <td><span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></td>
    `;
    tbody.appendChild(row);
  });
}

async function loadNotifications() {
  try {
    const list = document.getElementById('notificationList');
    list.innerHTML = '<li class="loading-text">Loading notifications...</li>';
    
    const response = await fetch('/api/user-notifications');
    if (!response.ok) {
      throw new Error('Failed to load notifications');
    }
    const notifications = await response.json();
    renderNotifications(notifications);
  } catch (err) {
    console.error('Error loading notifications:', err);
    const list = document.getElementById('notificationList');
    list.innerHTML = `<li class="error-text">${err.message || 'Error loading notifications'}</li>`;
  }
}

function renderNotifications(notifications) {
  const list = document.getElementById('notificationList');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (!notifications || notifications.length === 0) {
    list.innerHTML = '<li class="loading-text">No notifications found</li>';
    return;
  }
  
  notifications.forEach(notification => {
    const item = document.createElement('li');
    item.className = notification.read ? '' : 'unread';
    item.innerHTML = `
      <div class="notification-content">
        <strong>${notification.type}:</strong> ${notification.message}
      </div>
      <div class="notification-footer">
        <span class="notification-date">${formatDate(notification.createdAt)}</span>
        ${!notification.read ? 
          `<button class="mark-done-btn action-btn" data-id="${notification._id}">Mark Read</button>` : 
          ''}
      </div>
    `;
    list.appendChild(item);
  });
}

async function markNotificationDone(notificationId) {
  if (!notificationId) return;
  
  try {
    const response = await fetch(`/api/mark-notification-done/${notificationId}`, {
      method: 'PATCH'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark notification as done');
    }

    showNotification('Notification marked as read');
    loadNotifications();
  } catch (err) {
    console.error('Error marking notification:', err);
    showNotification(err.message || 'Failed to mark notification', 'error');
  }
}

async function returnItem(itemId) {
  if (!itemId || !confirm('Are you sure you want to return this item?')) {
    return;
  }

  try {
    const response = await fetch('/api/return-item', {
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

    const data = await response.json();
    showNotification('Item return requested successfully');
    
    // Reload items
    await Promise.all([loadMyItems(), loadReturnItems()]);
  } catch (err) {
    console.error('Error returning item:', err);
    showNotification(err.message || 'Failed to request item return', 'error');
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
    loadRequests();
  } catch (err) {
    console.error('Error cancelling request:', err);
    showNotification(err.message || 'Failed to cancel request', 'error');
  }
}

function exportToExcel(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  // Get the section name for the file name
  const sectionName = table.closest('.tab-content')?.id || 'data';
  const fileName = `${sectionName}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Clone the table to manipulate it
  const clone = table.cloneNode(true);
  
  // Remove action buttons from the clone
  const actionButtons = clone.querySelectorAll('.action-btn');
  actionButtons.forEach(btn => btn.remove());

  // Convert to worksheet
  const ws = XLSX.utils.table_to_sheet(clone);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  
  // Export the file
  XLSX.writeFile(wb, fileName);
  showNotification(`Exported ${sectionName} data to Excel`);
}

function filterTable(tableId) {
  const prefix = tableId.replace('Body', '');
  const searchTerm = document.getElementById(`search${prefix}`)?.value.toLowerCase() || '';
  const typeFilter = document.getElementById(`typeFilter${prefix}`)?.value || '';
  const dateFilter = document.getElementById(`dateFilter${prefix}`)?.value || '';
  const quantityFilter = document.getElementById(`qtyFilter${prefix}`)?.value || '';
  const ledgerFilter = document.getElementById(`ledgerFilter${prefix}`)?.value || '';
  
  let statusFilter = '';
  if (tableId === 'requestListBody' || tableId === 'returnListBody') {
    statusFilter = document.getElementById(`statusFilter${prefix}`)?.value || '';
  }
  
  const tableBody = document.getElementById(tableId);
  if (!tableBody) return;
  
  Array.from(tableBody.getElementsByTagName('tr')).forEach(row => {
    const cells = row.getElementsByTagName('td');
    if (cells.length === 0) return;
    
    let itemName = '';
    let itemType = '';
    let itemDate = '';
    let itemStatus = '';
    let itemQty = '';
    let itemLedger = '';
    
    if (tableId === 'myItemsBody' || tableId === 'approvedItemsBody' || tableId === 'returnListBody') {
      itemName = cells[3]?.textContent.toLowerCase() || '';
      itemType = cells[2]?.textContent || '';
      itemDate = cells[4]?.textContent || '';
      itemQty = cells[5]?.textContent || '';
      itemLedger = cells[1]?.textContent || '';
    } else if (tableId === 'requestListBody') {
      itemName = cells[2]?.textContent.toLowerCase() || '';
      itemType = cells[1]?.textContent || '';
      itemDate = cells[3]?.textContent || '';
      itemQty = cells[4]?.textContent || '';
      itemStatus = cells[5]?.textContent || '';
    }
    
    const matchesSearch = searchTerm === '' || 
      itemName.includes(searchTerm) || 
      itemLedger.includes(searchTerm);
    const matchesType = typeFilter === '' || itemType === typeFilter;
    const matchesDate = dateFilter === '' || itemDate.includes(dateFilter);
    const matchesStatus = statusFilter === '' || itemStatus === statusFilter;
    const matchesQty = quantityFilter === '' || itemQty.includes(quantityFilter);
    const matchesLedger = ledgerFilter === '' || itemLedger.includes(ledgerFilter);
    
    row.style.display = matchesSearch && matchesType && matchesDate && 
      matchesStatus && matchesQty && matchesLedger ? '' : 'none';
  });
}

function filterNotifications() {
  const searchTerm = document.getElementById('searchNotifications')?.value.toLowerCase() || '';
  const typeFilter = document.getElementById('typeFilterNotifications')?.value || '';
  const dateFilter = document.getElementById('dateFilterNotifications')?.value || '';
  
  const list = document.getElementById('notificationList');
  if (!list) return;
  
  const items = list.querySelectorAll('li');
  
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    const type = item.querySelector('strong')?.textContent.replace(':', '') || '';
    const date = item.querySelector('.notification-date')?.textContent || '';
    
    const matchesSearch = searchTerm === '' || text.includes(searchTerm);
    const matchesType = typeFilter === '' || type === typeFilter;
    const matchesDate = dateFilter === '' || date === dateFilter;
    
    item.style.display = matchesSearch && matchesType && matchesDate ? '' : 'none';
  });
}

function resetFilters(target) {
  const prefix = target.replace('Body', '').replace('List', '');
  
  // Reset all filter inputs
  document.getElementById(`search${prefix}`).value = '';
  document.getElementById(`typeFilter${prefix}`).value = '';
  document.getElementById(`dateFilter${prefix}`).value = '';
  
  if (document.getElementById(`qtyFilter${prefix}`)) {
    document.getElementById(`qtyFilter${prefix}`).value = '';
  }
  
  if (document.getElementById(`ledgerFilter${prefix}`)) {
    document.getElementById(`ledgerFilter${prefix}`).value = '';
  }
  
  if (document.getElementById(`statusFilter${prefix}`)) {
    document.getElementById(`statusFilter${prefix}`).value = '';
  }
  
  // Reapply empty filters to show all rows
  if (target === 'notificationList') {
    filterNotifications();
  } else {
    filterTable(target);
  }
  
  showNotification('Filters reset');
}

function showNotification(message, type = 'success') {
  const toast = document.getElementById('notificationToast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `notification-toast ${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Helper functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<tr><td colspan="7" class="loading-text">Loading data...</td></tr>';
  }
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<tr><td colspan="7" class="error-text">${message}</td></tr>`;
  }
}

// Make functions available globally for event handlers
window.returnItem = returnItem;
window.cancelRequest = cancelRequest;
window.filterTable = filterTable;
window.filterNotifications = filterNotifications;
window.markNotificationDone = markNotificationDone;
window.exportToExcel = exportToExcel;
window.resetFilters = resetFilters;