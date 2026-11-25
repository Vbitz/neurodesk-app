// Native acceptance entry point with an explicit image and isolated profile.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const image = process.argv[2];
const archive = image && path.isAbsolute(image);
if (
  !image ||
  (archive && !fs.statSync(image).isFile()) ||
  (!archive && !/^[^\s:/]+(?:\.[^\s:/]+)+\/[^\s]+$/.test(image))
) {
  throw new Error(
    'Pass an absolute Docker archive path or a registry image reference'
  );
}
const root = path.resolve(__dirname, '..');
const gpu = process.argv[3] !== 'software';
const reuse = process.argv[4];
if (reuse && !/^cc-(gpu|software)-[A-Za-z0-9]+$/.test(reuse)) {
  throw new Error('Invalid isolated acceptance directory');
}
const run = reuse
  ? path.join(root, 'build', reuse)
  : fs.mkdtempSync(path.join(root, 'build', gpu ? 'cc-gpu-' : 'cc-software-'));
if (fs.realpathSync(run) !== run) {
  throw new Error('Acceptance directory must not be a symlink');
}
if (fs.existsSync(path.join(run, 'report.json'))) {
  fs.copyFileSync(
    path.join(run, 'report.json'),
    path.join(run, 'report-previous.json')
  );
}
const env = {
  ...process.env,
  NEURODESK_CC_IMAGE: archive ? 'docker-archive:' + image : image,
  NEURODESK_CC_CVMFS: process.env.NEURODESK_CC_CVMFS || (archive ? '0' : '1'),
  NEURODESK_ACCEPTANCE_DIR: run,
  NEURODESK_ACCEPTANCE_GPU: gpu ? '1' : '0'
};
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  require('electron'),
  [path.join(__dirname, 'crumblecracker-e2e-main.js')],
  {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  }
);
// Never persist arbitrary application/guest output: it may contain tokens.
child.stdout.resume();
child.stderr.resume();
console.log('Acceptance directory:', path.relative(root, run));
let terminating = false;
const cleanup = () => {
  if (!terminating) {
    terminating = true;
    child.kill('SIGTERM');
  }
};
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
child.on('error', error => {
  console.error('Electron launch failed:', error.message);
  process.exitCode = 1;
});
child.on('exit', code => {
  console.log('Electron acceptance exit:', code);
  const report = path.join(run, 'report.json');
  if (fs.existsSync(report)) {
    console.log(fs.readFileSync(report, 'utf8'));
  }
  process.exitCode = code === 0 ? 0 : 1;
});
