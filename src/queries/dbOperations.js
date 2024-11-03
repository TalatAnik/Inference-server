// dbOperations.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  }
});

function addInEntry({ timestamp, product_name, product_count }, callback) {
  const sql = `
    INSERT INTO opening (timestamp, product_name, entry_type, product_count)
    VALUES (?, ?, 'IN', ?)
  `;
  db.run(sql, [timestamp, product_name, product_count], function(err) {
    if (err) {
      // Check if error is due to CHECK constraint failure
      if (err.message.includes('CHECK constraint failed')) {
        callback(new Error('Invalid product_name value.'));
      } else {
        callback(err);
      }
    } else {
      callback(null, { entryId: this.lastID });
    }
  });
}


function addOpenEntry({ timestamp, product_name, product_count }, callback) {
  const sql = `
    INSERT INTO opening (timestamp, product_name, entry_type, product_count)
    VALUES (?, ?, 'IN', ?)
  `;
  db.run(sql, [timestamp, product_name, product_count], function(err) {
    if (err) {
      // Check if error is due to CHECK constraint failure
      if (err.message.includes('CHECK constraint failed')) {
        callback(new Error('Invalid product_name value.'));
      } else {
        callback(err);
      }
    } else {
      callback(null, { entryId: this.lastID });
    }
  });
}

module.exports = { addInEntry, addOpenEntry };
