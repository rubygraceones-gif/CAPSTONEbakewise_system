const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const ZIP_NAME = 'BakeWiseTeam_BakeWise_Testing.zip';
const ZIP_PATH = path.join(ROOT_DIR, ZIP_NAME);

console.log('--- PACKAGING VERIFICATION & BUILD ---');

// 1. Verify evidence files
const evidenceDir = path.join(ROOT_DIR, 'evidence');
const evidenceFiles = fs.readdirSync(evidenceDir);
console.log(`Found ${evidenceFiles.length} files in evidence/`);

// 2. Verify test-results files
const resultsDir = path.join(ROOT_DIR, 'test-results');
const resultsFiles = fs.readdirSync(resultsDir);
console.log(`Found ${resultsFiles.length} files in test-results/`);

// 3. Verify root documents
const formPath = path.join(ROOT_DIR, 'Pre_UAT_System_Testing_Submission_Form.txt');
const repoLinkPath = path.join(ROOT_DIR, 'repository_link.txt');
console.log('Pre_UAT_System_Testing_Submission_Form.txt exists:', fs.existsSync(formPath));
console.log('repository_link.txt exists:', fs.existsSync(repoLinkPath));

// 4. Remove old zip if exists
if (fs.existsSync(ZIP_PATH)) {
  fs.unlinkSync(ZIP_PATH);
  console.log('Removed previous ZIP archive.');
}

// 5. Create ZIP via PowerShell Compress-Archive
console.log('Creating submission ZIP package...');
const psCommand = `powershell -Command "Compress-Archive -Path 'evidence', 'test-results', 'Pre_UAT_System_Testing_Submission_Form.txt', 'repository_link.txt' -DestinationPath '${ZIP_NAME}' -Force"`;
execSync(psCommand, { cwd: ROOT_DIR, stdio: 'inherit' });

console.log('ZIP archive created successfully!');
const stats = fs.statSync(ZIP_PATH);
console.log(`ZIP file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

// 6. Verify ZIP contents using PowerShell with assembly loaded
const checkCommand = `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip = [System.IO.Compression.ZipFile]::OpenRead('${ZIP_PATH}'); Write-Output ('Total entries in ZIP: ' + $zip.Entries.Count); $top = $zip.Entries | Select-Object -First 10 | ForEach-Object { $_.FullName }; Write-Output 'Sample entries:'; Write-Output $top; $zip.Dispose()"`;
execSync(checkCommand, { cwd: ROOT_DIR, stdio: 'inherit' });
console.log('ZIP package integrity successfully verified!');
