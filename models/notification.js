const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Request', 'Approval', 'Rejection', 'Return', 'Alert'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Archived'],
    default: 'Pending'
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recipientRole: {
    type: String,
    enum: ['User', 'Inventory_Holder', 'MMG_Inventory_Holder', 'Super_Admin']
  },
  relatedRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },
  relatedApprovedItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovedItem'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date
  }
});

module.exports = mongoose.model('Notification', notificationSchema);