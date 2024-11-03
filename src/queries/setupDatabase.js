// setupDatabase.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Database opened successfully.');
  }
});

function runScript(scriptPath, callback) {
  const script = fs.readFileSync(scriptPath, 'utf8');
  db.exec(script, (err) => {
    if (err) {
      console.error(`Error executing ${scriptPath}:`, err.message);
    } else {
      console.log(`Executed ${scriptPath} successfully.`);
    }
    callback(err);
  });
}

// Run deletion and creation scripts sequentially
runScript('src/sql/deleteTables.sql', (err) => {
  if (!err) {
    runScript('src/sql/createTables.sql', (err) => {
      if (!err) {
        console.log('Database setup completed successfully.');
      }
      db.close();
    });
  } else {
    db.close();
  }
});
