const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function clearData() {
  try {
    const db = await open({
      filename: path.join(__dirname, 'library.db'),
      driver: sqlite3.Database
    });

    // Clear Students Data and Booked Seats
    await db.exec(`DELETE FROM students;`);
    await db.exec(`DELETE FROM seats;`);

    console.log('🧹 All Students and Seat bookings cleared successfully from SQLite!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing database:', err.message);
    process.exit(1);
  }
}

clearData();