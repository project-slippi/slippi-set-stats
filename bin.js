const computeSetStats = require('.');
const readline = require('readline');

computeSetStats();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log();
rl.question("Press enter key to exit...", ans => {
  rl.close();
});