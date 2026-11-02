
const http = require('http');
const { Pool } = require('pg');

const port = Number(process.env.PORT || 8080);
const schema = process.env.DB_SCHEMA;
const service = process.env.SERVICE_NAME || schema;

const coreUrl = process.env.CORE_URL || 'http://oi-core';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'techlogix_lab',
  user: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD || 'change_me_local',
});

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });

  res.end(JSON.stringify(data));
}


const server = http.createServer(async (req, res) => {
  
  if (req.url === '/call-core' && req.method === 'GET') {
    try {
      const response = await fetch(`${coreUrl}/`);
      const data = await response.json();

      return send(res, response.status, {
        calledBy: 'oi-attendence',
        calledService: 'oi-core',
        coreResponse: data
      });
    } catch (error) {
      return send(res, 502, {
        error: 'Could not connect to Core',
        detail: error.message
      });
    }
  }
    // Health check endpoint
  if (req.url === '/health') {
    try {
      await pool.query('SELECT 1');

      return send(res, 200, {
        service,
        status: 'ok',
        database: 'connected',
      });
    } catch (e) {
      return send(res, 503, {
        service,
        status: 'unavailable',
        detail: e.message,
      });
    }
  }

  // Root endpoint: GET and POST
  if (req.url === '/' || req.url.startsWith('/?')) {

    // GET: Retrieve all items
    if (req.method === 'GET') {
      try {
        const result = await pool.query(`
          SELECT id, name, created_at
          FROM ${schema}.items
          ORDER BY id DESC
        `);

        return send(res, 200, {
          service,
          items: result.rows,
        });
      } catch (e) {
        return send(res, 500, {
          error: 'database query failed',
          detail: e.message,
        });
      }
    }

    // POST: Create a new item
    if (req.method === 'POST') {
      let raw = '';

      req.on('data', (chunk) => {
        raw += chunk;
      });

      req.on('end', async () => {
        try {
          const payload = JSON.parse(raw || '{}');

          if (
            typeof payload.name !== 'string' ||
            !payload.name.trim()
          ) {
            return send(res, 400, {
              error: 'name is required',
            });
          }

          const result = await pool.query(
            `
              INSERT INTO ${schema}.items (name)
              VALUES ($1)
              RETURNING id, name, created_at
            `,
            [payload.name.trim()]
          );

          return send(res, 201, {
            service,
            item: result.rows[0],
          });
        } catch (e) {
          return send(res, 400, {
            error: 'invalid request or database error',
            detail: e.message,
          });
        }
      });

      return;
    }
  }

  // Handle unknown routes
  return send(res, 404, {
    error: 'not found',
    service,
  });
});

// Start the HTTP server
server.listen(port, '0.0.0.0', () => {
  console.log(
    `${service} listening on ${port}; schema=${schema}`
  );
});
