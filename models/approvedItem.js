const mongoose = require('mongoose');

const approvedItemSchema = new mongoose.Schema({
  itemName: { 
    type: String, 
    required: true,
    enum: [
      // Electronics
      'Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Printer', 'Projector',
      // Stationery
      'Notebook', 'Pen', 'Pencil', 'Stapler', 'Highlighter', 'Sticky Notes',
      // Furniture
      'Chair', 'Table', 'Desk', 'Cabinet', 'Bookshelf', 'Filing Cabinet',
      // Tools
      'Screwdriver Set', 'Hammer', 'Wrench', 'Pliers', 'Drill Machine', 'Measuring Tape',
      // Cleaning
      'Broom', 'Mop', 'Dustpan', 'Cleaning Cloth', 'Disinfectant Spray', 'Trash Bags',
      // Miscellaneous
      'Whiteboard', 'Bulletin Board', 'First Aid Kit', 'Fire Extinguisher', 'Step Ladder', 'Toolbox'
    ]
  },
  type: { 
    type: String, 
    required: true,
    enum: ['Electronics', 'Stationery', 'Furniture', 'Tools', 'Cleaning', 'Miscellaneous']
  },
  quantity: { type: Number, required: true, min: 1 },
  ledgerNo: { type: String, required: true },
  issuedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  departmentApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedDate: { type: Date, default: Date.now },
  returned: { type: Boolean, default: false },
  returnDate: { type: Date },
  department: { 
    type: String,
    enum: ['DIR SECT', 'FSEG', 'IT', 'QRS', 'PCM', 'PSEG', 'MMG', 'ADMIN', 
           'FINANCE', 'MT', 'SECURITY', 'TFA', 'CAL', 'SARC', 'ESRG', 'FC&HB'],
    required: true
  },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' }
}, { timestamps: true });

// Add validation to ensure itemName matches type
approvedItemSchema.pre('validate', function(next) {
  const itemCategories = {
    Electronics: ['Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Printer', 'Projector'],
    Stationery: ['Notebook', 'Pen', 'Pencil', 'Stapler', 'Highlighter', 'Sticky Notes'],
    Furniture: ['Chair', 'Table', 'Desk', 'Cabinet', 'Bookshelf', 'Filing Cabinet'],
    Tools: ['Screwdriver Set', 'Hammer', 'Wrench', 'Pliers', 'Drill Machine', 'Measuring Tape'],
    Cleaning: ['Broom', 'Mop', 'Dustpan', 'Cleaning Cloth', 'Disinfectant Spray', 'Trash Bags'],
    Miscellaneous: ['Whiteboard', 'Bulletin Board', 'First Aid Kit', 'Fire Extinguisher', 'Step Ladder', 'Toolbox']
  };

  if (!itemCategories[this.type].includes(this.itemName)) {
    this.invalidate('itemName', `Item name must match the selected type (${this.type})`);
  }
  next();
});

module.exports = mongoose.model("ApprovedItem", approvedItemSchema);