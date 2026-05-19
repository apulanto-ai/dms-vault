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

function parseDiskSizes(duOutput) {
  const sizes = {};
  for (const line of duOutput.split('\n')) {
    const [kb, path] = line.split('\t');
    if (!path) continue;
    const parts = path.trim().split('/');
    const user = parts[parts.length - 1];
    const domain = parts[parts.length - 2];
    if (user && domain) sizes[`${user}@${domain}`] = parseInt(kb, 10);
  }
  return sizes;
}

function formatKb(kb) {
  if (kb >= 1024 * 1024) return (kb / (1024 * 1024)).toFixed(1) + ' GB';
  if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB';
  return kb + ' KB';
}

async function listAccounts() {
  const [listOutput, duOutput] = await Promise.all([
    execInContainer(['setup', 'email', 'list']),
    execInContainer(['sh', '-c', 'du -sk /var/mail/*/*']).catch(() => ''),
  ]);

  if (!listOutput) return [];

  const diskSizes = parseDiskSizes(duOutput);

  return stripAnsi(listOutput)
    .split('\n')
    .map((line) => {
      const m = line.match(/\*\s*(\S+@\S+)\s+\(\s*(\S+)\s*\/\s*(\S+)\s*\)\s*\[(\d+)%\]/);
      const email = m ? m[1] : line.replace(/^\*\s*/, '').trim().split(/\s+/)[0];
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

      const diskKb = diskSizes[email] ?? null;
      const diskLabel = diskKb !== null ? formatKb(diskKb) : null;

      if (m) return { email, used: m[2], limit: m[3], pct: parseInt(m[4], 10), diskLabel };
      return { email, used: '0', limit: '~', pct: 0, diskLabel };
    })
    .filter(Boolean);
}

async function getContainerStatus() {
  try {
    const container = docker.getContainer(CONTAINER_NAME);
    const info = await container.inspect();
    return {
      name: CONTAINER_NAME,
      running: info.State.Running,
      status: info.State.Status,
      startedAt: info.State.Running ? info.State.StartedAt : null,
    };
  } catch {
    return { name: CONTAINER_NAME, running: false, status: 'not found', startedAt: null };
  }
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

module.exports = { listAccounts, addAccount, deleteAccount, updatePassword, getContainerStatus };
