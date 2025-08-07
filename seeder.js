const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/userdata");
const Stock = require("./models/stock");
const Request = require("./models/request");
const ApprovedItem = require("./models/approvedItem");
const AuditLog = require("./models/auditLog");
require("dotenv").config();

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect( process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/inventorySystem");
    console.log("MongoDB connected");

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Stock.deleteMany({}),
      Request.deleteMany({}),
      ApprovedItem.deleteMany({}),
      AuditLog.deleteMany({})
    ]);
    console.log("Cleared existing data");

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("1234", salt);
    const adminPassword = await bcrypt.hash("admin123", salt);

    // Create users with hashed passwords
    const users = await User.create([
      {
        name: "Inventory Holder",
        userId: "INV001",
        email: "inventory@example.com",
        cadre: "Technical_Officer",
        designation: "Inventory Manager",
        department: "IT",
        password: hashedPassword,
        role: "Inventory_Holder",
        mobile_number: "1234567890",
        gender: "M",
        is_active: true
      },
      {
        name: "MMG Holder",
        userId: "MMG001",
        email: "mmg@example.com",
        cadre: "Scientist",
        designation: "MMG Manager",
        department: "MMG",
        password: hashedPassword,
        role: "MMG_Inventory_Holder",
        mobile_number: "1234567890",
        gender: "M",
        is_active: true
      },
      {
        name: "Super Admin",
        userId: "ADMIN001",
        email: "admin@example.com",
        cadre: "Chief_Admin_Officer",
        designation: "System Admin",
        department: "ADMIN",
        password: adminPassword,
        role: "Super_Admin",
        mobile_number: "1234567890",
        gender: "M",
        is_active: true
      },
      {
        name: "Regular User",
        userId: "USER001",
        email: "user@example.com",
        cadre: "Technical_Officer",
        designation: "Staff",
        department: "IT",
        password: hashedPassword,
        role: "User",
        mobile_number: "1234567890",
        gender: "M",
        is_active: true
      },
      {
        name: "Finance Officer",
        userId: "FIN001",
        email: "finance@example.com",
        cadre: "Account_Officer",
        designation: "Finance Officer",
        department: "FINANCE",
        password: hashedPassword,
        role: "User",
        mobile_number: "1234567890",
        gender: "F",
        is_active: true
      }
    ]);
    console.log(`Created ${users.length} users`);

    // Create stock items
    const stockItems = await Stock.create([
      {
        ledgerNo: "001",
        name: "Laptop",
        type: "Electronics",
        quantity: 15,
        department: "IT"
      },
      {
        ledgerNo: "004",
        name: "Microscope",
        type: "Tools",
        quantity: 8,
        department: "MMG"
      },
      {
        ledgerNo: "005",
        name: "Printer",
        type: "Electronics",
        quantity: 5,
        department: "ADMIN"
      },
      {
        ledgerNo: "002",
        name: "Keyboard",
        type: "Electronics",
        quantity: 20,
        department: "IT"
      },
      {
        ledgerNo: "003",
        name: "Test Kit",
        type: "Lab Equipment",
        quantity: 15,
        
      },
      {
        ledgerNo: "006",
        name: "Calculator",
        type: "Electronics",
        quantity: 10,
        department: "FINANCE"
      }
    ]);
    console.log(`Created ${stockItems.length} stock items`);

    // Create some sample requests
    const requests = await Request.create([
      {
        itemName: "Laptop",
        type: "Electronics",
        quantity: 2,
        requestedBy: users[3]._id, // Regular User
        status: "Pending",
        department: "IT"
      },
      {
        itemName: "Microscope",
        type: "Tools",
        quantity: 1,
        requestedBy: users[3]._id, // Regular User
        status: "Pending",
        department: "MMG"
      },
      {
        itemName: "Calculator",
        type: "Electronics",
        quantity: 1,
        requestedBy: users[4]._id, // Finance Officer
        status: "Pending",
        department: "FINANCE"
      }
    ]);
    console.log(`Created ${requests.length} requests`);

    // Create some approved items
    const approvedItems = await ApprovedItem.create([
      {
        itemName: "Printer",
        type: "Electronics",
        quantity: 1,
        ledgerNo: "009",
        issuedTo: users[0]._id, // Inventory Holder
        approvedBy: users[2]._id, // Super Admin
        approvedDate: new Date(),
        department: "ADMIN"
      },
      {
        itemName: "Keyboard",
        type: "Electronics",
        quantity: 2,
        ledgerNo: "008",
        issuedTo: users[3]._id, // Regular User
        approvedBy: users[0]._id, // Inventory Holder
        approvedDate: new Date(),
        department: "IT"
      }
    ]);
    console.log(`Created ${approvedItems.length} approved items`);

    // Create some audit logs
    const auditLogs = await AuditLog.create([
      {
        userId: users[2]._id, // Super Admin
        action: "System Initialization",
        details: "Database seeded with initial data",
        ipAddress: "127.0.0.1"
      },
      {
        userId: users[0]._id, // Inventory Holder
        action: "Item Approval",
        details: "Approved keyboard for regular user",
        ipAddress: "127.0.0.1"
      },
      {
        userId: users[3]._id, // Regular User
        action: "Item Request",
        details: "Requested laptop",
        ipAddress: "127.0.0.1"
      }
    ]);
    console.log(`Created ${auditLogs.length} audit logs`);

    // Close connection
    await mongoose.connection.close();
    console.log("Database seeding completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("Database seeding failed:", err);
    process.exit(1);
  }
}

seedDatabase();
