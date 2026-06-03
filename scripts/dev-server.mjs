import { spawn } from 'node:child_process';
import net from 'node:net';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const preferredPort = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

async function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function isPortAvailable(port) {
  if (await canConnect(port)) {
    return false;
  }

  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen({ host, port, exclusive: true });
  });
}

async function findAvailablePort(startPort) {
  let port = startPort;

  while (!(await isPortAvailable(port))) {
    port += 1;
  }

  return port;
}

async function shouldUseFallbackPort(port) {
  if (!process.stdin.isTTY) {
    console.error(
      `Port ${preferredPort} is already in use. Re-run in a terminal and confirm port ${port}, or set PORT=${port}.`,
    );
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(
    `Port ${preferredPort} is already in use. Use port ${port} instead? (Y/n) `,
  );
  rl.close();

  return answer.trim() === '' || answer.trim().toLowerCase().startsWith('y');
}

const selectedPort = await findAvailablePort(preferredPort);

if (selectedPort !== preferredPort && !(await shouldUseFallbackPort(selectedPort))) {
  console.log('Dev server not started.');
  process.exit(0);
}

const viteBin = process.platform === 'win32' ? 'vite.cmd' : 'vite';
const vite = spawn(viteBin, ['--host', host, '--port', String(selectedPort), '--strictPort'], {
  shell: true,
  stdio: 'inherit',
});

vite.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
