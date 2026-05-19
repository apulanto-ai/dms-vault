const Docker = require('dockerode');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const CONTAINER_NAME = process.env.DMS_CONTAINER || 'docker-mailserver';

async function execInContainer(cmd) {
  const container = docker.getContainer(CONTAINER_NAME);

  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
  });

  return new Promise((resolve, reject) => {
    exec.start({ hijack: true, stdin: false }, (err, stream) => {
      if (err) return reject(err);

      let stdout = '';
      let stderr = '';

      docker.modem.demuxStream(
        stream,
        { write: (data) => { stdout += data.toString(); } },
        { write: (data) => { stderr += data.toString(); } }
      );

      stream.on('end', () => {
        console.log(`[exec] ${cmd.join(' ')}`);
        console.log(`[stdout] ${JSON.stringify(stdout)}`);
        if (stderr.trim()) console.log(`[stderr] ${JSON.stringify(stderr)}`);
        resolve(stdout.trim());
      });

      stream.on('error', reject);
    });
  });
}

// Strip ANSI escape codes
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

async function listAccounts() {
  const output = await execInContainer(['setup', 'email', 'list']);
  if (!output) return [];

  return stripAnsi(output)
    .split('\n')
    .map((line) => line.replace(/^\*\s*/, '').trim().split(/\s+/)[0])
    .filter((token) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token));
}

async function addAccount(email, password) {
  await execInContainer(['setup', 'email', 'add', email, password]);
}

async function deleteAccount(email) {
  await execInContainer(['setup', 'email', 'del', email]);
}

async function updatePassword(email, password) {
  await execInContainer(['setup', 'email', 'update', email, password]);
}

module.exports = { listAccounts, addAccount, deleteAccount, updatePassword };
