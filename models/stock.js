// stock.js
const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  ledgerNo: {
  type: String,
  required: true,
  validate: {
    validator: function(v) {
      return /^[A-Za-z0-9-]+$/.test(v); // allows letters, numbers, and dashes
    },
    message: props => `${props.value} is not a valid ledger number`
  }
},
  name: { 
    type: String, 
    required: true,
    enum: [
      // Electronics
      'Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Printer', 'Projector', 'Calculator',
      // Stationery
      'Notebook', 'Pen', 'Pencil', 'Stapler', 'Highlighter', 'Sticky Notes',
      // Furniture
      'Chair', 'Table', 'Desk', 'Cabinet', 'Bookshelf', 'Filing Cabinet',
      // Tools
      'Screwdriver Set', 'Hammer', 'Wrench', 'Pliers', 'Drill Machine', 'Measuring Tape', 'Microscope',
      // Cleaning
      'Broom', 'Mop', 'Dustpan', 'Cleaning Cloth', 'Disinfectant Spray', 'Trash Bags',
      // Miscellaneous
      'Whiteboard', 'Bulletin Board', 'First Aid Kit', 'Fire Extinguisher', 'Step Ladder', 'Toolbox',
      // Lab Equipment
      'Test Kit'
    ]
  },
  type: { 
    type: String, 
    required: true,
    enum: ['Electronics', 'Stationery', 'Furniture', 'Tools', 'Cleaning', 'Miscellaneous', 'Lab Equipment']
  },
  quantity: { type: Number, required: true, min: 0 },
  department: { 
    type: String,
    enum: ['DIR SECT', 'FSEG', 'IT', 'QRS', 'PCM', 'PSEG', 'MMG', 'ADMIN', 
           'FINANCE', 'MT', 'SECURITY', 'TFA', 'CAL', 'SARC', 'ESRG', 'FC&HB'],
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update validation to match all items
stockSchema.pre('validate', function(next) {
  const itemCategories = {
    Electronics: ['Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Printer', 'Projector', 'Calculator'],
    Stationery: ['Notebook', 'Pen', 'Pencil', 'Stapler', 'Highlighter', 'Sticky Notes'],
    Furniture: ['Chair', 'Table', 'Desk', 'Cabinet', 'Bookshelf', 'Filing Cabinet'],
    Tools: ['Screwdriver Set', 'Hammer', 'Wrench', 'Pliers', 'Drill Machine', 'Measuring Tape', 'Microscope'],
    Cleaning: ['Broom', 'Mop', 'Dustpan', 'Cleaning Cloth', 'Disinfectant Spray', 'Trash Bags'],
    Miscellaneous: ['Whiteboard', 'Bulletin Board', 'First Aid Kit', 'Fire Extinguisher', 'Step Ladder', 'Toolbox'],
    'Lab Equipment': ['Test Kit']
  };

  if (this.type && this.name && itemCategories[this.type]) {
    if (!itemCategories[this.type].includes(this.name)) {
      this.invalidate('name', `"${this.name}" is not a valid item for type "${this.type}". Valid items are: ${itemCategories[this.type].join(', ')}`);
    }
  }
  next();
});

module.exports = mongoose.model("Stock", stockSchema);
