const fs = require('fs');

const raw = fs.readFileSync('branches.txt', 'utf8');
const lines = raw.trim().split('\n');

let sql = `
  // 1. bw_branches
  await mysqlPool.query(\`
    CREATE TABLE IF NOT EXISTS bw_branches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      latitude FLOAT DEFAULT 300,
      longitude FLOAT DEFAULT 200,
      address TEXT,
      store_hours VARCHAR(100),
      contact_no VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  \`);

  await mysqlPool.query(\`
    INSERT INTO bw_branches (id, name, address, store_hours, contact_no, latitude, longitude, status) VALUES
`;

const values = lines.map(line => {
  let parts = line.split('\t');
  if (parts.length < 5) {
     // try split by double space if tab failed
     parts = line.split('  ').filter(p => p.trim() !== '');
  }
  
  if (parts.length >= 3) {
      let [id, name, address, hours, contact] = parts;
      id = parseInt(id.trim());
      name = name ? name.trim().replace(/'/g, "''") : '';
      address = address ? address.trim().replace(/'/g, "''") : '';
      hours = hours ? hours.trim().replace(/'/g, "''") : '';
      contact = contact ? contact.trim().replace(/'/g, "''") : '';
      
      // We don't have lat/long for these, so use dummy values or defaults
      let lat = 100 + (id % 10) * 10;
      let lng = 200 + (id % 10) * 10;
      
      return `    (${id}, '${name}', '${address}', '${hours}', '${contact}', ${lat}, ${lng}, 'Active')`;
  }
  return null;
}).filter(v => v !== null);

sql += values.join(',\n') + `
    ON DUPLICATE KEY UPDATE 
      name = VALUES(name), 
      address = VALUES(address),
      store_hours = VALUES(store_hours),
      contact_no = VALUES(contact_no);
  \`);
`;

fs.writeFileSync('generated_branches.txt', sql);
console.log("Success");
