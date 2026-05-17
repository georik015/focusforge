const { exec } = require('child_process');

const url = process.argv[2];

if (!url) {
  console.log('Usage: node open.js <url>');
  process.exit(1);
}

exec(`powershell.exe -Command "Start-Process '${url}'"`, (error) => {
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Opened:', url);
  }
});
