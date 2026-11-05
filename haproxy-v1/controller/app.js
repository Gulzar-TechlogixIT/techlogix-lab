const http = require('http');
const { spawn } = require('child_process');

const PORT = 9090;

const modes = {
  v1: [
    'disable server api_versions/v2',
    'enable server api_versions/v1',
    'disable server ui_versions/v2',
    'enable server ui_versions/v1',
  ],

  v2: [
    'enable server api_versions/v2',
    'disable server api_versions/v1',
    'enable server ui_versions/v2',
    'disable server ui_versions/v1',
  ],

  auto: [
    'enable server api_versions/v2',
    'enable server api_versions/v1',
    'enable server ui_versions/v2',
    'enable server ui_versions/v1',
  ],
};

function execute(command) {
  return new Promise((resolve, reject) => {
    const process = spawn('socat', [
      '-',
      'UNIX-CONNECT:/var/run/haproxy/admin.sock',
    ]);

    let output = '';
    let error = '';

    process.stdout.on('data', data => output += data);
    process.stderr.on('data', data => error += data);

    process.on('close', code => {
      if (code !== 0 || /unknown command|no such|permission denied/i.test(output + error)) {
        return reject(new Error(output + error));
      }

      resolve(output.trim());
    });

    process.stdin.end(command + '\n');
  });
}

async function setMode(mode) {
  for (const command of modes[mode]) {
    await execute(command);
  }

  return { mode, status: 'applied' };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/health') {
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  if (req.method === 'POST' && req.url === '/mode') {
    let body = '';

    for await (const chunk of req) body += chunk;

    try {
      const { mode } = JSON.parse(body || '{}');

      if (!modes[mode]) {
        res.writeHead(400);
        return res.end(JSON.stringify({
          error: 'Mode must be v1, v2 or auto',
        }));
      }

      const result = await setMode(mode);
      return res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(500);
      return res.end(JSON.stringify({
        error: 'Mode change failed',
        detail: error.message,
      }));
    }
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Traffic controller listening on ${PORT}`);
});