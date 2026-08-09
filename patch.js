const fs = require('fs');

const serverJsPath = 'server.js';
const generatedSqlPath = 'generated_branches.txt';

let serverJs = fs.readFileSync(serverJsPath, 'utf8');
const sql = fs.readFileSync(generatedSqlPath, 'utf8');

// Find the section to replace: from "// 1. bw_branches" to the end of the INSERT query (before "// 2. bw_users")
const startStr = '// 1. bw_branches';
const endStr = '// 2. bw_users';

const startIndex = serverJs.indexOf(startStr);
const endIndex = serverJs.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const prefix = serverJs.substring(0, startIndex);
  const suffix = serverJs.substring(endIndex);
  
  const newServerJs = prefix + sql + '\n  ' + suffix;
  fs.writeFileSync(serverJsPath, newServerJs);
  console.log("Successfully patched server.js mysql section");
} else {
  console.log("Could not find replacement markers in server.js");
}

