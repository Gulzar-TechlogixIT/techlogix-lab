
const http = require('http');
const { Pool } = require('pg');

// Server configuration
const port = Number(process.env.PORT || 8080);
const schema = process.env.DB_SCHEMA;
const service = process.env.SERVICE_NAME || schema;

//CALL TRACK URL
const trackUrl = process.env.TRACK_URL || 'http://oi-track:8080';

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'techlogix_lab',
  user: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD || 'change_me_local',
});

// Send JSON response
function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });

  res.end(JSON.stringify(data));
}

// Create HTTP server
const server = http.createServer(async (req, res) => {

  //function to call TRACK 
  if (req.url === '/call-track' && req.method === 'GET') {
  try {
    const response = await fetch(`${trackUrl}/`);
    const data = await response.json();

    return send(res, response.status, {
      calledBy: 'oi-core',
      calledService: 'oi-track',
      trackResponse: data
    });
  } catch (error) {
    return send(res, 502, {
      error: 'Could not connect to Track',
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

  // Root endpoint
  if (req.url === '/' || req.url.startsWith('/?')) {

    // GET: Fetch all items
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

          // Validate item name
          if (
            typeof payload.name !== 'string' ||
            !payload.name.trim()
          ) {
            return send(res, 400, {
              error: 'name is required',
            });
          }

          // Insert item into the database
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

  if (req.url === '/health/dependencies' && req.method === 'GET') {
  try {
    const response = await fetch(`${trackUrl}/health`);

    if (!response.ok) {
      return send(res, 503, {
        service: 'oi-core',
        status: 'unhealthy',
        dependency: 'oi-track'
      });
    }

    const trackHealth = await response.json();

    return send(res, 200, {
      service: 'oi-core',
      status: 'healthy',
      dependencies: {
        track: trackHealth
      }
    });
  } catch (error) {
    return send(res, 503, {
      service: 'oi-core',
      status: 'unhealthy',
      dependency: 'oi-track',
      detail: error.message
    });
  }
}

  // Handle unknown routes
  return send(res, 404, {
    error: 'not found',
    service,
  });
});

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(
    `${service} listening on ${port}; schema=${schema}`
  );
});
