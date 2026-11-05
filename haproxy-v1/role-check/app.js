'use strict';

const net = require('node:net');
const { Pool } = require('pg');

const common = {
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'techlogix_lab',
  user: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD,
  max: 2,
  connectionTimeoutMillis: 1500,
  idleTimeoutMillis: 5000,
  query_timeout: 2000,
  application_name: 'haproxy-postgres-role-agent',
};

if (!common.password) {
  throw new Error('DB_PASSWORD is required');
}

const primaryPool = new Pool({
  ...common,
  host: process.env.DB_HOST_PRIMARY || 'oi-db',
});

const replicaPool = new Pool({
  ...common,
  host: process.env.DB_HOST_REPLICA || 'oi-db-replica',
});

const checks = [
  {
    name: 'oi-db-primary',
    pool: primaryPool,
    expectedRecovery: false,
    port: Number(process.env.AGENT_PORT_PRIMARY_PRIMARY || 9101),
  },
  {
    name: 'oi-db-standby',
    pool: primaryPool,
    expectedRecovery: true,
    port: Number(process.env.AGENT_PORT_PRIMARY_REPLICA || 9102),
  },
  {
    name: 'oi-db-replica-primary',
    pool: replicaPool,
    expectedRecovery: false,
    port: Number(process.env.AGENT_PORT_REPLICA_PRIMARY || 9103),
  },
  {
    name: 'oi-db-replica-standby',
    pool: replicaPool,
    expectedRecovery: true,
    port: Number(process.env.AGENT_PORT_REPLICA_REPLICA || 9104),
  },
];

function startAgent(check) {
  const server = net.createServer((socket) => {
    socket.setTimeout(3000);

    check.pool
      .query('SELECT pg_is_in_recovery() AS in_recovery')
      .then(({ rows }) => {
        const isRecovery = rows[0]?.in_recovery === true;
        const healthy = isRecovery === check.expectedRecovery;
        if (!socket.destroyed) {
          socket.end(healthy ? 'up\n' : 'down\n');
        }
      })
      .catch((error) => {
        console.error(`[${check.name}] role check failed: ${error.message}`);
        if (!socket.destroyed) socket.end('down\n');
      });

    socket.on('timeout', () => socket.destroy());
    socket.on('error', () => {});
  });

  server.listen(check.port, '0.0.0.0', () => {
    console.log(`[${check.name}] agent listening on ${check.port}`);
  });

  server.on('error', (error) => {
    console.error(`[${check.name}] agent server error: ${error.message}`);
    process.exitCode = 1;
  });
}

for (const check of checks) startAgent(check);

for (const [name, pool] of [
  ['oi-db', primaryPool],
  ['oi-db-replica', replicaPool],
]) {
  pool.on('error', (error) => {
    console.error(`[${name}] PostgreSQL pool error: ${error.message}`);
  });
}

function shutdown() {
  Promise.all([primaryPool.end(), replicaPool.end()]).finally(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
