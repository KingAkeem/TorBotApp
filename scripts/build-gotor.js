const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repository = path.resolve(
  process.env.GOTOR_DIR || path.join(__dirname, '..', '..', 'gotor'),
);
const outputDirectory = path.join(repository, 'bin');
const output = path.join(
  outputDirectory,
  process.platform === 'win32' ? 'gotor.exe' : 'gotor',
);

if (!fs.existsSync(path.join(repository, 'go.mod'))) {
  console.error(`GoTor repository not found at ${repository}`);
  process.exit(1);
}

fs.mkdirSync(outputDirectory, { recursive: true });
const result = spawnSync('go', ['build', '-trimpath', '-o', output, './cmd/main'], {
  cwd: repository,
  stdio: 'inherit',
  shell: false,
});
if (result.error) {
  console.error(`Unable to run Go: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  process.exit(result.status || 1);
}
console.log(`Built GoTor at ${output}`);
