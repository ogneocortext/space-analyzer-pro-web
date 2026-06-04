const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/space-analyzer.db');

// Check if analyses table exists and has data
db.all('SELECT name FROM sqlite_master WHERE type="table" AND name="analyses"', (err, tables) => {
  if (err) {
    console.error('Error checking tables:', err);
    process.exit(1);
  }
  
  if (tables.length === 0) {
    console.log('No analyses table found');
    process.exit(0);
  }
  
  // Check for existing analyses
  db.all('SELECT * FROM analyses ORDER BY created_at DESC LIMIT 5', (err, rows) => {
    if (err) {
      console.error('Error querying analyses:', err);
      process.exit(1);
    }
    
    console.log('Found', rows.length, 'analyses:');
    rows.forEach((row, index) => {
      console.log((index + 1) + '. Path: ' + row.path + ', Created: ' + row.created_at);
    });
    
    db.close();
  });
});
