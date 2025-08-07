const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  ledgerNo: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: function(v) {
        return /^\d+$/.test(v); 
      },
      message: props => `${props.value} is not a valid ledger number (numbers only)`
    }
  },
  name: { 
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

// Add validation to ensure name matches type
stockSchema.pre('validate', function(next) {
  const itemCategories = {
    Electronics: ['Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Printer', 'Projector'],
    Stationery: ['Notebook', 'Pen', 'Pencil', 'Stapler', 'Highlighter', 'Sticky Notes'],
    Furniture: ['Chair', 'Table', 'Desk', 'Cabinet', 'Bookshelf', 'Filing Cabinet'],
    Tools: ['Screwdriver Set', 'Hammer', 'Wrench', 'Pliers', 'Drill Machine', 'Measuring Tape'],
    Cleaning: ['Broom', 'Mop', 'Dustpan', 'Cleaning Cloth', 'Disinfectant Spray', 'Trash Bags'],
    Miscellaneous: ['Whiteboard', 'Bulletin Board', 'First Aid Kit', 'Fire Extinguisher', 'Step Ladder', 'Toolbox']
  };

  if (!itemCategories[this.type].includes(this.name)) {
    this.invalidate('name', `Item name must match the selected type (${this.type})`);
  }
  next();
});

module.exports = mongoose.model("Stock", stockSchema);