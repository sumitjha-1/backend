const mongoose = require('mongoose');

// Define item categories with their valid items
const itemCategories = {
  Electronics: ['Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Printer', 'Projector'],
  Stationery: ['Notebook', 'Pen', 'Pencil', 'Stapler', 'Highlighter', 'Sticky Notes'],
  Furniture: ['Chair', 'Table', 'Desk', 'Cabinet', 'Bookshelf', 'Filing Cabinet'],
  Tools: ['Screwdriver Set', 'Hammer', 'Wrench', 'Pliers', 'Drill Machine', 'Measuring Tape'],
  Cleaning: ['Broom', 'Mop', 'Dustpan', 'Cleaning Cloth', 'Disinfectant Spray', 'Trash Bags'],
  Miscellaneous: ['Whiteboard', 'Bulletin Board', 'First Aid Kit', 'Fire Extinguisher', 'Step Ladder', 'Toolbox']
};

const requestSchema = new mongoose.Schema({
  itemName: { 
    type: String, 
    required: [true, 'Item name is required'],
    trim: true,
    enum: {
      values: Object.values(itemCategories).flat(),
      message: 'Invalid item name. Please select from the available options.'
    }
  },
  type: { 
    type: String, 
    required: [true, 'Item type is required'],
    enum: {
      values: Object.keys(itemCategories),
      message: 'Invalid item type. Please select from the available categories.'
    }
  },
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'], 
    min: [1, 'Quantity must be at least 1']
  },
  requestedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Department Approved', 'MMG Approved', 'Rejected', 'Returned'],
    default: 'Pending'
  },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  departmentApprovedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  department: { 
    type: String,
    enum: ['DIR SECT', 'FSEG', 'IT', 'QRS', 'PCM', 'PSEG', 'MMG', 'ADMIN', 
           'FINANCE', 'MT', 'SECURITY', 'TFA', 'CAL', 'SARC', 'ESRG', 'FC&HB'],
    required: true
  },
  rejectionReason: { type: String },
  departmentApprovalDate: { type: Date },
  mmgApprovalDate: { type: Date },
  rejectedDate: { type: Date },
  returnDate: { type: Date },
  ledgerNo: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Enhanced validation to ensure itemName matches type
requestSchema.pre('validate', function(next) {
  if (this.type && this.itemName) {
    const validItems = itemCategories[this.type];
    if (!validItems.includes(this.itemName)) {
      this.invalidate('itemName', `"${this.itemName}" is not a valid item for type "${this.type}". Valid items are: ${validItems.join(', ')}`);
    }
  }
  next();
});

// Update the timestamp before saving
requestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method for department approval
requestSchema.statics.approveByDepartment = async function(requestId, userId) {
  return this.findByIdAndUpdate(
    requestId,
    { 
      status: 'Department Approved',
      departmentApprovedBy: userId,
      departmentApprovalDate: Date.now(),
      updatedAt: Date.now()
    },
    { new: true }
  );
};

// Static method for MMG approval
requestSchema.statics.approveByMMG = async function(requestId, userId, ledgerNo) {
  return this.findByIdAndUpdate(
    requestId,
    { 
      status: 'MMG Approved',
      approvedBy: userId,
      mmgApprovalDate: Date.now(),
      ledgerNo: ledgerNo || `LEDG-${Date.now()}`,
      updatedAt: Date.now()
    },
    { new: true }
  );
};

// Static method for rejection
requestSchema.statics.rejectRequest = async function(requestId, userId, reason) {
  return this.findByIdAndUpdate(
    requestId,
    { 
      status: 'Rejected',
      rejectedBy: userId,
      rejectionReason: reason,
      rejectedDate: Date.now(),
      updatedAt: Date.now()
    },
    { new: true }
  );
};

// Static method for return
requestSchema.statics.markReturned = async function(requestId) {
  return this.findByIdAndUpdate(
    requestId,
    { 
      status: 'Returned',
      returnDate: Date.now(),
      updatedAt: Date.now()
    },
    { new: true }
  );
};

// Query helper for pending department requests
requestSchema.query.pendingDepartmentRequests = function(department) {
  return this.where({ 
    status: 'Pending',
    department 
  });
};

// Query helper for department approved requests
requestSchema.query.departmentApprovedRequests = function() {
  return this.where({ 
    status: 'Department Approved'
  });
};

// Query helper for user requests
requestSchema.query.userRequests = function(userId) {
  return this.where({ 
    requestedBy: userId 
  });
};

module.exports = mongoose.model("Request", requestSchema);