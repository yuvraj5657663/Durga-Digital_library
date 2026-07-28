const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./library_master.db');

// 🔴 SAARE STUDENTS KO DELETE KARNE KE LIYE:
db.run("DELETE FROM admissions", (err) => {
    if (err) console.error("Error:", err.message);
    else console.log("✅ Saare registered students delete ho gaye hain!");
});

/* 
// 🔴 KISI EK SPECIFIC EMAIL SE DELETE KARNE KE LIYE (Upar wale ko comment karke ise uncomment kar sakte hain):
db.run("DELETE FROM admissions WHERE email_id = 'student@gmail.com'", (err) => {
    if (err) console.error("Error:", err.message);
    else console.log("✅ Student delete ho gaya!");
});
*/