const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  designation: { type: String, required: true },
  cadre: {
    type: String,
    required: true,
    enum: ['Scientist', 'Technical_Officer', 'Account_Officer', 'Chief_Admin_Officer', 'Other']
  },
  department: { 
    type: String, 
    required: true,
    enum: ['DIR SECT', 'FSEG', 'IT', 'QRS', 'PCM', 'PSEG', 'MMG', 'ADMIN', 
           'FINANCE', 'MT', 'SECURITY', 'TFA', 'CAL', 'SARC', 'ESRG', 'FC&HB']
  },
  password: { type: String, required: true },
  dob: { type: Date },
  gender: { type: String, enum: ['M', 'F', 'Other'] },
  mobile_number: { type: String },
  role: {
    type: String,
    enum: ['User', 'Inventory_Holder', 'MMG_Inventory_Holder', 'Super_Admin'],
    default: 'User'
  },
  createdAt: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null }
});

module.exports = mongoose.model("User", userSchema);