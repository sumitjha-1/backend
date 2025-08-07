require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const flash = require('connect-flash');
const User = require("./models/userdata");
const Stock = require("./models/stock");
const Request = require("./models/request");
const ApprovedItem = require("./models/approvedItem");
const AuditLog = require("./models/auditLog");
const Notification = require("./models/notification");

const app = express();

// ======================
// MIDDLEWARE SETUP
// ======================
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use('/stylesheet', express.static(path.join(__dirname, 'public/stylesheet')));
app.use('/javascript', express.static(path.join(__dirname, 'public/javascript')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here-12345',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(flash());

// Make user and messages available to all views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;
  res.locals.messages = req.flash();
  next();
});

// ======================
// DATABASE CONNECTION
// ======================
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/inventorySystem", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log("✅ MongoDB connected");
    initializeDefaultData();
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

async function initializeDefaultData() {
  try {
    // Initialize default stock items for each department
    const departments = ['MMG', 'IT', 'HR', 'Finance', 'Operations'];
    const stockCount = await Stock.countDocuments();
    
    if (stockCount === 0) {
      const defaultItems = [
        { ledgerNo: "LEDG-ELEC-001", name: "Laptop", type: "Electronics", quantity: 10, department: "MMG" },
        { ledgerNo: "LEDG-STAT-001", name: "Notebook", type: "Stationery", quantity: 50, department: "MMG" },
        { ledgerNo: "LEDG-FURN-001", name: "Chair", type: "Furniture", quantity: 20, department: "MMG" }
      ];
      
      await Stock.insertMany(defaultItems);
      console.log("✅ Created default stock items");
    }

    // Initialize admin user if none exists
    const adminCount = await User.countDocuments({ role: "Super_Admin" });
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("admin123", salt);
      
      await User.create({
        name: "Admin",
        userId: "admin",
        email: "admin@inventory.com",
        cadre: "Admin",
        designation: "System Administrator",
        department: "MMG",
        password: hashedPassword,
        mobile_number: "1234567890",
        gender: "Male",
        role: "Super_Admin",
        is_active: true
      });
      console.log("✅ Created default admin user");
    }
  } catch (err) {
    console.error("❌ Error initializing default data:", err);
  }
}

// ======================
// AUTHENTICATION MIDDLEWARE
// ======================
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error', 'Please login to access this page');
    return res.redirect('/');
  }
  next();
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.session.user || !allowedRoles.includes(req.session.user.role)) {
      req.flash('error', 'You are not authorized to access this page');
      return res.redirect('/');
    }
    next();
  };
};

// Password hashing middleware
const hashPassword = async (req, res, next) => {
  if (req.body.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error processing password" });
    }
  } else {
    next();
  }
};

// Helper function for dashboard redirection
function redirectToDashboard(req, res) {
  const user = req.session.user;
  
  switch (user.role) {
    case "User":
      return res.redirect('/user-dashboard');
    case "Inventory_Holder":
      return res.redirect('/inventory-dashboard');
    case "MMG_Inventory_Holder":
      return res.redirect('/mmg-dashboard');
    case "Super_Admin":
      return res.redirect('/admin-dashboard');
    default:
      req.flash('error', 'Unauthorized role');
      return res.redirect('/');
  }
}

// ======================
// ROUTES
// ======================

// Home route
app.get('/', (req, res) => {
  if (req.session.user) {
    return redirectToDashboard(req, res);
  }
  res.render("login", { error: null, userId: '' });
});

// Registration routes
app.get('/register', (req, res) => {
  res.render("register", { error: null });
});

app.post('/register', 
  async (req, res, next) => {
    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    next();
  },
  hashPassword,
  async (req, res) => {
    const { name, userId, email, cadre, designation, department, password, mobile_number, gender } = req.body;

    if (!name || !userId || !email || !cadre || !designation || !department || !mobile_number) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!/^[0-9]{10,15}$/.test(mobile_number)) {
      return res.status(400).json({ error: "Invalid phone number (10-15 digits required)" });
    }

    try {
      const existingUser = await User.findOne({ $or: [{ email }, { userId }] });
      if (existingUser) {
        return res.status(400).json({ 
          error: existingUser.email === email ? 'Email already in use' : 'User ID already exists'
        });
      }

      const newUser = await User.create({
        name, userId, email, cadre, designation, department, password, mobile_number,
        gender: gender || 'Other', role: "User", is_active: true
      });

      // Notify super admin about new user
      await Notification.create({
        type: 'User',
        message: `New user registered: ${newUser.name} (${newUser.department})`,
        recipientRole: 'Super_Admin',
        status: 'Pending'
      });

      await new AuditLog({
        userId: newUser._id,
        action: 'Registration',
        details: 'New user registered',
        ipAddress: req.ip
      }).save();

      res.status(201).json({ 
        success: true, 
        message: 'Registration successful! Please login',
        redirect: '/'
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: "Registration successful! Please login" });
    }
  }
);

// Login route
app.post('/login', async (req, res) => {
  const { userId, password } = req.body;

  try {
    const user = await User.findOne({ userId: userId.trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.is_active === false) return res.status(403).json({ error: 'Account is inactive. Contact admin.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // Regenerate session to prevent fixation
    req.session.regenerate(err => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Login failed. Please try again.' });
      }

      // Save user data in new session
      req.session.user = {
        _id: user._id, 
        userId: user.userId, 
        name: user.name, 
        email: user.email,
        cadre: user.cadre, 
        role: user.role, 
        department: user.department,
        designation: user.designation, 
        mobile_number: user.mobile_number, 
        gender: user.gender
      };

      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Login failed. Please try again.' });
        }

        AuditLog.create({
          userId: user._id,
          action: 'Login',
          details: 'User logged in',
          ipAddress: req.ip
        }).catch(console.error);

        res.json({ 
          success: true, 
          redirect: redirectToDashboardUrl(user.role) 
        });
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

function redirectToDashboardUrl(role) {
  switch (role) {
    case "User": return '/user-dashboard';
    case "Inventory_Holder": return '/inventory-dashboard';
    case "MMG_Inventory_Holder": return '/mmg-dashboard';
    case "Super_Admin": return '/admin-dashboard';
    default: return '/';
  }
}

// ======================
// DASHBOARD ROUTES
// ======================

// User Dashboard
app.get('/user-dashboard', requireAuth, requireRole(['User']), async (req, res) => {
  try {
    const [items, requests, notifications] = await Promise.all([
      ApprovedItem.find({ issuedTo: req.session.user._id, returned: false })
        .sort({ approvedDate: -1 })
        .lean(),
      Request.find({ requestedBy: req.session.user._id })
        .sort({ createdAt: -1 })
        .lean(),
      Notification.find({ recipient: req.session.user._id, status: 'Pending' })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    res.render('user', { 
      user: req.session.user, 
      items: items || [], 
      requests: requests || [],
      notifications: notifications || [],
      itemOptions: Request.schema.path('type').enumValues
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load user dashboard');
    res.redirect('/');
  }
});

// Inventory Holder Dashboard
app.get('/inventory-dashboard', requireAuth, requireRole(['Inventory_Holder']), async (req, res) => {
  try {
    const [stock, requests, approvedItems, departmentUsers, notifications] = await Promise.all([
      Stock.find({ department: req.session.user.department }).lean(),
      Request.find({ 
        department: req.session.user.department, 
        status: 'Pending'
      })
        .populate('requestedBy', 'name designation department cadre')
        .sort({ createdAt: -1 })
        .lean(),
      ApprovedItem.find({ 
        department: req.session.user.department, 
        returned: false 
      })
        .populate('issuedTo', 'name designation department cadre')
        .sort({ approvedDate: -1 })
        .lean(),
      User.find({ 
        department: req.session.user.department, 
        _id: { $ne: req.session.user._id },
        role: 'User'
      })
        .select('userId name email designation cadre mobile_number')
        .lean(),
      Notification.find({ 
        recipient: req.session.user._id, 
        status: 'Pending' 
      })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    res.render('inventoryholder', { 
      user: req.session.user,
      stock: stock || [],
      requests: requests || [],
      approvedItems: approvedItems || [],
      departmentUsers: departmentUsers || [],
      notifications: notifications || []
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load inventory dashboard');
    res.redirect('/');
  }
});

// MMG Dashboard
app.get('/mmg-dashboard', requireAuth, requireRole(['MMG_Inventory_Holder']), async (req, res) => {
  try {
    const [stock, requests, approvedItems, notifications] = await Promise.all([
      Stock.find({}).lean(),
      Request.find({ 
        status: 'Department Approved'
      })
        .populate('requestedBy', 'name designation department cadre')
        .populate('departmentApprovedBy', 'name')
        .sort({ departmentApprovalDate: -1 })
        .lean(),
      ApprovedItem.find({ 
        returned: false 
      })
        .populate('issuedTo', 'name designation department cadre')
        .sort({ approvedDate: -1 })
        .lean(),
      Notification.find({ 
        recipient: req.session.user._id, 
        status: 'Pending' 
      })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    res.render('mmgholder', { 
      user: req.session.user,
      stock: stock || [],
      requests: requests || [],
      approvedItems: approvedItems || [],
      notifications: notifications || []
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load MMG dashboard');
    res.redirect('/');
  }
});

// Admin Dashboard
app.get('/admin-dashboard', requireAuth, requireRole(['Super_Admin']), async (req, res) => {
  try {
    const [users, stock, requests, approvedItems, auditLogs, notifications] = await Promise.all([
      User.find({ _id: { $ne: req.session.user._id } }).lean(),
      Stock.find({}).lean(),
      Request.find({})
        .populate('requestedBy', 'name department designation cadre')
        .sort({ createdAt: -1 })
        .lean(),
      ApprovedItem.find({})
        .populate('issuedTo', 'name department cadre')
        .populate('approvedBy', 'name')
        .sort({ approvedDate: -1 })
        .lean(),
      AuditLog.find({}).sort({ timestamp: -1 }).limit(100).lean(),
      Notification.find({ 
        recipient: req.session.user._id, 
        status: 'Pending' 
      })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    res.render('superadmin', {
      user: req.session.user,
      users: users || [],
      stock: stock || [],
      requests: requests || [],
      approvedItems: approvedItems || [],
      auditLogs: auditLogs || [],
      notifications: notifications || []
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load admin dashboard');
    res.redirect('/');
  }
});

// ======================
// USER API ENDPOINTS
// ======================

app.get('/api/user-requests', requireAuth, async (req, res) => {
  try {
    const requests = await Request.find({ requestedBy: req.session.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.get('/api/user-approved-items', requireAuth, async (req, res) => {
  try {
    const items = await ApprovedItem.find({ 
      issuedTo: req.session.user._id,
      returned: false
    }).sort({ approvedDate: -1 }).lean();
    res.json(items || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.post('/api/request-item', requireAuth, async (req, res) => {
  try {
    const { itemName, type, quantity } = req.body;
    
    // Additional validation
    if (!itemName || !type || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Check if item type is valid
    const validTypes = Request.schema.path('type').enumValues;
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid item type' });
    }

    // Check if item name is valid for the type
    const validItems = {
      Electronics: ['Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Printer', 'Projector'],
      Stationery: ['Notebook', 'Pen', 'Pencil', 'Stapler', 'Highlighter', 'Sticky Notes'],
      Furniture: ['Chair', 'Table', 'Desk', 'Cabinet', 'Bookshelf', 'Filing Cabinet'],
      Tools: ['Screwdriver Set', 'Hammer', 'Wrench', 'Pliers', 'Drill Machine', 'Measuring Tape'],
      Cleaning: ['Broom', 'Mop', 'Dustpan', 'Cleaning Cloth', 'Disinfectant Spray', 'Trash Bags'],
      Miscellaneous: ['Whiteboard', 'Bulletin Board', 'First Aid Kit', 'Fire Extinguisher', 'Step Ladder', 'Toolbox']
    };
    if (!validItems[type]?.includes(itemName)) {
      return res.status(400).json({ error: 'Invalid item for selected type' });
    }

    const newRequest = await Request.create({
      itemName,
      type,
      quantity,
      requestedBy: req.session.user._id,
      status: 'Pending',
      department: req.session.user.department,
      requestDate: new Date()
    });

    // Create notification for inventory holder
    const inventoryHolder = await User.findOne({
      department: req.session.user.department,
      role: 'Inventory_Holder'
    });

    if (inventoryHolder) {
      await Notification.create({
        type: 'Request',
        message: `New request for ${quantity} ${itemName} from ${req.session.user.name}`,
        status: 'Pending',
        recipient: inventoryHolder._id,
        relatedRequest: newRequest._id
      });
    }

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Item Request',
      details: `Requested ${quantity} ${itemName}`,
      ipAddress: req.ip
    }).save();

    res.json({ 
      success: true, 
      request: newRequest,
      message: `Request for ${quantity} ${itemName} submitted successfully`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

app.delete('/api/cancel-request/:id', requireAuth, async (req, res) => {
  try { 
    const request = await Request.findOneAndDelete({
      _id: req.params.id,
      requestedBy: req.session.user._id,
      status: 'Pending'
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or cannot be cancelled' });
    }

    // Delete any related notifications
    await Notification.deleteMany({ relatedRequest: request._id });

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Request Cancellation',
      details: `Cancelled request for ${request.itemName}`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

app.post('/api/return-item', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.body;
    
    const item = await ApprovedItem.findOne({
      _id: itemId,
      issuedTo: req.session.user._id,
      returned: false
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found or already returned' });
    }

    // Create a return request instead of directly updating stock
    const returnRequest = await Request.create({
      itemName: item.itemName,
      type: item.type,
      quantity: item.quantity,
      requestedBy: req.session.user._id,
      status: 'Return Pending',
      department: req.session.user.department,
      relatedApprovedItem: item._id,
      requestDate: new Date()
    });

    // Notify MMG inventory holder
    const mmgHolder = await User.findOne({ role: 'MMG_Inventory_Holder' });
    if (mmgHolder) {
      await Notification.create({
        type: 'Return Request',
        message: `Return request for ${item.quantity} ${item.itemName} from ${req.session.user.name}`,
        status: 'Pending',
        recipient: mmgHolder._id,
        relatedRequest: returnRequest._id
      });
    }

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Return Request',
      details: `Requested return of ${item.itemName}`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true, returnRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create return request' });
  }
});

app.get('/api/my-stock', requireAuth, async (req, res) => {
  try {
    const items = await ApprovedItem.find({ 
      issuedTo: req.session.user._id,
      returned: false
    })
    .select('ledgerNo itemName type quantity approvedDate department')
    .lean()
    .then(items => items.map(item => ({
      ...item,
      issueDate: item.approvedDate
    })));
    res.json(items || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.get('/api/my-requests', requireAuth, async (req, res) => {
  try {
    const requests = await Request.find({ 
      requestedBy: req.session.user._id 
    })
    .select('type itemName requestDate quantity status rejectionReason')
    .sort({ createdAt: -1 })
    .lean();
    res.json(requests || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.post('/api/update-profile', requireAuth, async (req, res) => {
  try {
    const { name, email, dob, designation, cadre, password, role } = req.body;
    
    const updateData = { name, email, dob, designation, cadre };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    if (role && role !== req.session.user.role) {
      // Notify super admin about role change
      await Notification.create({
        type: 'Role Change',
        message: `${req.session.user.name} changed their role from ${req.session.user.role} to ${role}`,
        recipientRole: 'Super_Admin',
        status: 'Pending'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.session.user._id,
      updateData,
      { new: true }
    ).lean();

    req.session.user = {
      ...req.session.user,
      name: user.name,
      email: user.email,
      designation: user.designation,
      cadre: user.cadre
    };

    await new AuditLog({
      userId: user._id,
      action: 'Profile Update',
      details: 'User updated their profile',
      ipAddress: req.ip
    }).save();

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ======================
// NOTIFICATION ENDPOINTS
// ======================

app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.session.user._id,
      status: 'Pending'
    });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ count: 0 });
  }
});

app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.session.user._id
    }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.post('/api/notifications/mark-read', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.session.user._id, status: 'Pending' },
      { status: 'Read', readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post('/api/send-notification', requireAuth, requireRole(['MMG_Inventory_Holder', 'Super_Admin']), async (req, res) => {
  try {
    const { userId, message, type } = req.body;

    if (!userId || !message || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const notification = await Notification.create({
      type,
      message,
      status: 'Pending',
      recipient: userId,
      createdBy: req.session.user._id
    });

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Send Notification',
      details: `Sent notification to ${user.name}: ${message}`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true, notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

app.post('/api/mark-notification-done', requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.body;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: req.session.user._id },
      { status: 'Done', readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Mark Notification Done',
      details: `Marked notification as done: ${notification.message}`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true, notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notification as done' });
  }
});

// ======================
// REQUEST FLOW ENDPOINTS
// ======================

app.get('/api/department-requests', requireAuth, requireRole(['Inventory_Holder']), async (req, res) => {
  try {
    const requests = await Request.find({
      department: req.session.user.department,
      status: 'Pending'
    })
    .populate('requestedBy', 'name designation department cadre')
    .sort({ createdAt: -1 })
    .lean();

    res.json(requests || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// Department approval endpoint
app.post('/api/department-approve-request', requireAuth, requireRole(['Inventory_Holder']), async (req, res) => {
  try {
    const { requestId } = req.body;
    
    const request = await Request.findByIdAndUpdate(
      requestId,
      { 
        status: 'Department Approved',
        departmentApprovedBy: req.session.user._id,
        departmentApprovalDate: new Date()
      },
      { new: true }
    ).populate('requestedBy', 'name department cadre').lean();

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Create notification for MMG holder
    const mmgHolder = await User.findOne({ role: 'MMG_Inventory_Holder' });
    if (mmgHolder) {
      await Notification.create({
        type: 'Approval',
        message: `New department-approved request for ${request.itemName} from ${request.requestedBy.name}`,
        status: 'Pending',
        recipient: mmgHolder._id,
        relatedRequest: request._id
      });
    }

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Department Approval',
      details: `Department approved request for ${request.itemName}`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true, request });
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

app.get('/api/mmg-pending-requests', requireAuth, requireRole(['MMG_Inventory_Holder']), async (req, res) => {
  try {
    const requests = await Request.find({ 
      status: { $in: ['Department Approved', 'Return Pending'] }
    })
    .populate('requestedBy', 'name designation department cadre')
    .populate('departmentApprovedBy', 'name')
    .sort({ departmentApprovalDate: -1 })
    .lean();
    
    res.json(requests || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// MMG approval endpoint
app.post('/api/mmg-approve-request', requireAuth, requireRole(['MMG_Inventory_Holder']), async (req, res) => {
  try {
    const { requestId, ledgerNo } = req.body;
    
    const request = await Request.findOne({
      _id: requestId,
      status: { $in: ['Department Approved', 'Return Pending'] }
    }).populate('requestedBy', 'name department cadre');

    if (!request) {
      return res.status(404).json({ error: 'Request not found or not in correct status' });
    }

    if (request.status === 'Department Approved') {
      // Handle regular request approval
      const stockItem = await Stock.findOne({
        name: request.itemName,
        department: 'MMG'
      });

      if (!stockItem || stockItem.quantity < request.quantity) {
        return res.status(400).json({ 
          error: 'Insufficient stock',
          available: stockItem ? stockItem.quantity : 0
        });
      }

      // Deduct from stock
      await Stock.findByIdAndUpdate(
        stockItem._id,
        { $inc: { quantity: -request.quantity } }
      );

      // Create approved item record
      const approvedItem = await ApprovedItem.create({
        itemName: request.itemName,
        type: request.type,
        quantity: request.quantity,
        ledgerNo: ledgerNo || `LEDG-${Date.now()}`,
        issuedTo: request.requestedBy._id,
        approvedBy: req.session.user._id,
        approvedDate: new Date(),
        department: request.department,
        departmentApprovedBy: request.departmentApprovedBy
      });

      // Update request status
      await Request.findByIdAndUpdate(
        requestId,
        { 
          status: 'MMG Approved',
          approvedBy: req.session.user._id,
          mmgApprovalDate: new Date(),
          ledgerNo: ledgerNo || `LEDG-${Date.now()}`
        }
      );

      // Create notification for requester
      await Notification.create({
        type: 'Approval',
        message: `Your request for ${request.itemName} has been approved`,
        status: 'Pending',
        recipient: request.requestedBy._id,
        relatedApprovedItem: approvedItem._id
      });

      await new AuditLog({
        userId: req.session.user._id,
        action: 'MMG Approval',
        details: `Approved request for ${request.itemName} with ledger ${ledgerNo}`,
        ipAddress: req.ip
      }).save();

      res.json({ 
        success: true, 
        request,
        approvedItem,
        remainingStock: stockItem.quantity - request.quantity
      });
    } else if (request.status === 'Return Pending') {
      // Handle return request approval
      const approvedItem = await ApprovedItem.findOneAndUpdate(
        { _id: request.relatedApprovedItem, returned: false },
        { returned: true, returnDate: new Date() },
        { new: true }
      );

      if (!approvedItem) {
        return res.status(404).json({ error: 'Approved item not found or already returned' });
      }

      // Add back to stock
      await Stock.findOneAndUpdate(
        { name: request.itemName, department: 'MMG' },
        { $inc: { quantity: request.quantity } },
        { upsert: true }
      );

      // Update request status
      await Request.findByIdAndUpdate(
        requestId,
        { 
          status: 'Return Approved',
          approvedBy: req.session.user._id,
          mmgApprovalDate: new Date()
        }
      );

      // Notify user
      await Notification.create({
        type: 'Return Approval',
        message: `Your return request for ${request.itemName} has been approved`,
        status: 'Pending',
        recipient: request.requestedBy._id,
        relatedRequest: request._id
      });

      await new AuditLog({
        userId: req.session.user._id,
        action: 'Return Approval',
        details: `Approved return of ${request.itemName}`,
        ipAddress: req.ip
      }).save();

      res.json({ 
        success: true, 
        request,
        approvedItem
      });
    }
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

app.post('/api/reject-request', requireAuth, requireRole(['Inventory_Holder', 'MMG_Inventory_Holder']), async (req, res) => {
  try {
    const { requestId, reason } = req.body;
    
    const request = await Request.findByIdAndUpdate(
      requestId,
      { 
        status: 'Rejected',
        rejectedBy: req.session.user._id,
        rejectionReason: reason,
        rejectedDate: new Date()
      },
      { new: true }
    ).populate('requestedBy', 'name email').lean();

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Create notification for requester
    await Notification.create({
      type: 'Rejection',
      message: `Your request for ${request.itemName} was rejected. Reason: ${reason}`,
      status: 'Pending',
      recipient: request.requestedBy._id,
      relatedRequest: request._id
    });

    // Mark any pending notifications about this request as read
    await Notification.updateMany(
      { relatedRequest: request._id, recipient: req.session.user._id },
      { status: 'Read' }
    );

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Request Rejection',
      details: `Rejected request for ${request.itemName}. Reason: ${reason}`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true, request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// ======================
// STOCK MANAGEMENT API
// ======================

app.get('/api/stock', requireAuth, requireRole(['MMG_Inventory_Holder', 'Super_Admin']), async (req, res) => {
  try {
    const stock = await Stock.find({}).lean();
    res.json(stock || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.post('/api/add-stock', requireAuth, requireRole(['MMG_Inventory_Holder', 'Super_Admin']), async (req, res) => {
  try {
    const { department,ledgerNo, type,name,   quantity } = req.body;
    
    // Validate required fields
    if (!name || !type || !department || !quantity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate quantity is a positive number
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be a positive number" });
    }

    // Validate ledger number is numeric only
    if (ledgerNo && !/^\d+$/.test(ledgerNo)) {
      return res.status(400).json({ error: "Ledger number must contain numbers only" });
    }

    // Check if item already exists in the same department
    const existingItem = await Stock.findOne({ name, department });
    if (existingItem) {
      // Update existing item's quantity
      const updatedItem = await Stock.findByIdAndUpdate(
        existingItem._id,
        { $inc: { quantity: quantity } },
        { new: true }
      );

      await new AuditLog({
        userId: req.session.user._id,
        action: 'Stock Update',
        details: `Added ${quantity} ${name} to ${department} stock (existing item)`,
        ipAddress: req.ip
      }).save();

      return res.json({ 
        success: true, 
        stockItem: updatedItem, 
        action: 'updated' 
      });
    }

    // Create new stock item
    const stockItem = await Stock.create({
      ledgerNo: ledgerNo || `${Date.now()}`, 
      name,
      type,
      department,
      quantity
    });

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Stock Creation',
      details: `Added ${quantity} ${name} to ${department} stock (new item)`,
      ipAddress: req.ip
    }).save();

    res.json({ 
      success: true, 
      stockItem, 
      action: 'created' 
    });
  } catch (err) {
    console.error(err);
    
    // Handle duplicate ledger number error
    if (err.code === 11000 && err.keyPattern.ledgerNo) {
      return res.status(400).json({ 
        error: "Ledger number already exists. Please use a unique number." 
      });
    }
    
    // Handle other validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: errors.join(', ') 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to add stock item' 
    });
  }
});

app.put('/api/stock/:id', requireAuth, requireRole(['MMG_Inventory_Holder', 'Super_Admin']), async (req, res) => {
  try {
    const { ledgerNo, name, type, department, quantity } = req.body;
    
    const stockItem = await Stock.findByIdAndUpdate(
      req.params.id,
      { ledgerNo, name, type, department, quantity },
      { new: true }
    ).lean();

    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Stock Update',
      details: `Updated stock item ${name}`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true, stockItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update stock item' });
  }
});

app.delete('/api/stock/:id', requireAuth, requireRole(['MMG_Inventory_Holder', 'Super_Admin']), async (req, res) => {
  try {
    const stockItem = await Stock.findByIdAndDelete(req.params.id).lean();

    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Stock Deletion',
      details: `Deleted stock item ${stockItem.name}`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete stock item' });
  }
});

app.post('/api/add-to-stock', requireAuth, requireRole(['MMG_Inventory_Holder', 'Super_Admin']), async (req, res) => {
  try {
    const { itemId } = req.body;
    
    const approvedItem = await ApprovedItem.findOne({
      _id: itemId,
      returned: true
    });

    if (!approvedItem) {
      return res.status(404).json({ error: 'Approved item not found or not returned' });
    }

    // Add back to stock
    const stockItem = await Stock.findOneAndUpdate(
      { name: approvedItem.itemName, department: 'MMG' },
      { $inc: { quantity: approvedItem.quantity } },
      { upsert: true, new: true }
    );

    // Create notification for user
    await Notification.create({
      type: 'Stock Update',
      message: `${approvedItem.quantity} ${approvedItem.itemName} added back to MMG stock`,
      status: 'Pending',
      recipient: req.session.user._id
    });

    await new AuditLog({
      userId: req.session.user._id,
      action: 'Add to Stock',
      details: `Added ${approvedItem.quantity} ${approvedItem.itemName} back to MMG stock`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true, stockItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add item to stock' });
  }
});

// ======================
// DEPARTMENT USER MANAGEMENT
// ======================

app.get('/api/department-users', requireAuth, requireRole(['Inventory_Holder']), async (req, res) => {
  try {
    const users = await User.find({ 
      department: req.session.user.department,
      _id: { $ne: req.session.user._id },
      role: 'User'
    })
    .select('userId name email designation cadre mobile_number')
    .lean();

    res.json(users || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.get('/api/user-items/:userId', requireAuth, requireRole(['Inventory_Holder']), async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.userId,
      department: req.session.user.department
    });

    if (!user) {
      return res.status(403).json({ error: 'Not authorized to view this user' });
    }

    const items = await ApprovedItem.find({ 
      issuedTo: req.params.userId,
      returned: false
    })
    .sort({ approvedDate: -1 })
    .lean();

    res.json(items || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// ======================
// USER MANAGEMENT API
// ======================

app.get('/api/users', requireAuth, requireRole(['Super_Admin']), async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.session.user._id } }).lean();
    res.json(users || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.put('/api/users/:id/status', requireAuth, requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { is_active } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { is_active },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await new AuditLog({
      userId: req.session.user._id,
      action: 'User Status Update',
      details: `Set user ${user.userId} status to ${is_active ? 'active' : 'inactive'}`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

app.put('/api/users/:id/role', requireAuth, requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { role } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await new AuditLog({
      userId: req.session.user._id,
      action: 'User Role Update',
      details: `Set user ${user.userId} role to ${role}`,
      ipAddress: req.ip
    }).save();

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

app.delete('/api/users/:id', requireAuth, requireRole(['Super_Admin']), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    await new AuditLog({
      userId: req.session.user._id,
      action: 'User Deletion',
      details: `Deleted user ${user.name} (${user.userId})`,
      ipAddress: req.ip
    }).save();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ======================
// AUDIT LOGS
// ======================

app.get('/api/audit-logs', requireAuth, requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    res.json(logs || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// ======================
// LOGOUT ROUTE
// ======================

app.get('/logout', (req, res) => {
  if (req.session.user) {
    AuditLog.create({
      userId: req.session.user._id,
      action: 'Logout',
      details: 'User logged out',
      ipAddress: req.ip
    }).catch(console.error);
  }

  req.session.destroy(err => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// ======================
// ERROR HANDLING
// ======================

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    user: req.session.user || null
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: 'Something went wrong!',
    user: req.session.user || null
  });
});

// ======================
// SERVER START
// ======================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});