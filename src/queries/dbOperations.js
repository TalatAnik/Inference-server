// dbOperations.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  }
});


// Function to get the last stock entry from the `stock` table
function getLastStockEntry() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM stock ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row);
    });
  });
}

// Function to insert multiple entries into the `entries` table
function insertEntries(entries) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT INTO entries (timestamp, product_name, entry_type, count) VALUES (?, ?, ?, ?)`);
    db.serialize(() => {
      entries.forEach((entry) => {
        stmt.run(entry.timestamp, entry.product_name, entry.entry_type, entry.count, (err) => {
          if (err) return reject(err);
        });
      });
      stmt.finalize((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}


// Function to insert a new snapshot into the `stock` table
function insertStockSnapshot(stock, timestamp) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO stock (timestamp, seven_up_250ml, sprite_250ml, pepsi_250ml, aquafina_500ml, kk_medley, bottle, cup)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(
      query,
      [
        timestamp,
        stock['seven_up_250ml'] || 0,
        stock['sprite_250ml'] || 0,
        stock['pepsi_250ml'] || 0,
        stock['aquafina_500ml'] || 0,
        stock['kk_medley'] || 0,
        stock['bottle'] || 0,
        stock['cup'] || 0,
      ],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}







async function getEntriesHistory() {
    const query = 'SELECT * FROM entries';
    const rows = [];
    // Execute the query and return all rows
    await getRecords(rows);
    return rows;

}


function getRecords(data){
    return new Promise((resolve,reject)=>{
        db.all('SELECT * FROM entries',[],(err,rows)=>{
            if(err){
            return console.error(err.message);
        }
        rows.forEach((row)=>{
            data.push(row);
        });
        
        resolve(data);
    })
  
  })
}


module.exports = {
  getLastStockEntry,
  insertEntries,
  insertStockSnapshot,
  getEntriesHistory,
};
