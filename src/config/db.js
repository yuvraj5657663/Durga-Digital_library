const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db = null;

async function initDB() {
  if (db) return db;

  // Path resolution for library.db
  const dbPath = path.join(__dirname, '../../library.db');

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Performance & Integrity Fixes (WAL mode + Foreign Keys)
  await db.exec(`PRAGMA journal_mode = WAL;`);
  await db.exec(`PRAGMA foreign_keys = ON;`);

  // 1. Create Active Students Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seatCode TEXT,
      name TEXT NOT NULL,
      email TEXT,
      mobile TEXT NOT NULL,
      preparation TEXT,
      duration TEXT,
      joiningDate TEXT,
      expiryDate TEXT,
      fee REAL,
      paymentMode TEXT DEFAULT 'Cash',
      shift TEXT,
      shiftHours TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Create Seats Matrix Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS seats (
      seat_key TEXT PRIMARY KEY,
      seat_number INTEGER,
      shift INTEGER,
      is_booked INTEGER DEFAULT 0,
      student_name TEXT,
      mobile TEXT,
      preparation TEXT,
      expiry_date TEXT
    );
  `);

  // 3. Create Online Inquiries Table (Google Forms)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      preparation TEXT,
      preferred_shift TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Create Archived / Deleted Students History Table (Soft Delete)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS archived_students (
      id INTEGER PRIMARY KEY,
      seatCode TEXT,
      name TEXT,
      email TEXT,
      mobile TEXT,
      preparation TEXT,
      duration TEXT,
      joiningDate TEXT,
      expiryDate TEXT,
      fee REAL,
      paymentMode TEXT,
      shift TEXT,
      shiftHours TEXT,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reason TEXT DEFAULT 'Deleted from Directory'
    );
  `);

  // 5. Migration Check: Auto-inject missing columns into existing students table
  const columnsInfo = await db.all(`PRAGMA table_info(students);`);
  const existingColumns = columnsInfo.map(c => c.name);

  const requiredColumns = [
    { name: 'seatCode', type: 'TEXT' },
    { name: 'name', type: 'TEXT' },
    { name: 'email', type: 'TEXT' },
    { name: 'mobile', type: 'TEXT' },
    { name: 'preparation', type: 'TEXT' },
    { name: 'duration', type: 'TEXT' },
    { name: 'joiningDate', type: 'TEXT' },
    { name: 'expiryDate', type: 'TEXT' },
    { name: 'fee', type: 'REAL' },
    { name: 'paymentMode', type: 'TEXT DEFAULT "Cash"' },
    { name: 'shift', type: 'TEXT' },
    { name: 'shiftHours', type: 'TEXT' }
  ];

  for (const col of requiredColumns) {
    if (!existingColumns.includes(col.name)) {
      await db.exec(`ALTER TABLE students ADD COLUMN ${col.name} ${col.type};`);
    }
  }

  // 6. Migration Check: Auto-inject missing columns into existing inquiries table
  //    Adds father_name, payment_status, admission_status for Online Admissions feature
  const inquiryColumnsInfo = await db.all(`PRAGMA table_info(inquiries);`);
  const existingInquiryColumns = inquiryColumnsInfo.map(c => c.name);

  const requiredInquiryColumns = [
    { name: 'father_name',       type: 'TEXT DEFAULT ""' },
    { name: 'payment_status',    type: 'TEXT DEFAULT "Pending"' },
    { name: 'admission_status',  type: 'TEXT DEFAULT "Pending"' }
  ];

  for (const col of requiredInquiryColumns) {
    if (!existingInquiryColumns.includes(col.name)) {
      await db.exec(`ALTER TABLE inquiries ADD COLUMN ${col.name} ${col.type};`);
    }
  }

  console.log('💾 SQLite Database connected & tables initialized successfully!');
  return db;
}

module.exports = { initDB };