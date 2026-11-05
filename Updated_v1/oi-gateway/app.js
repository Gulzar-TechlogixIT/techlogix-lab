
const http = require('http');

const port = Number(process.env.PORT || 8080);

//versioning 
const activeVersion = process.env.ACTIVE_VERSION || 'v1';

const targets = {
  attendance: process.env.ATTENDANCE_URL,
  core: process.env.CORE_URL,
  track: process.env.TRACK_URL
};


// IF PORT NUMER IS NOT " 8080 "
// const targets = {
//   attendance:
//     process.env.ATTENDANCE_URL || 'http://oi-attendence:8585',

//   core:
//     process.env.CORE_URL || 'http://oi-core:9595',

//   //removing to prevent direct user access .  
//   // track:
//   //   process.env.TRACK_URL || 'http://oi-track:7575',
// };

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });

  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.url === '/health') {
    return send(res, 200, {
      service: 'oi-gateway',
      status: 'ok',
    });
  }

const match = req.url.match(
  /^\/api\/(attendance|core)(\/.*)?$/
);


  // // Match API routes
  // const match = req.url.match(
  //   /^\/api\/(attendance|core|track)(\/.*)?$/
  // );



  

  if (!match) {
    return send(res, 404, {
      error: 'route not found',
      routes: [
        '/api/attendance',
        '/api/core'      
      ],
    });
  }

  const service = match[1];
  const path = match[2] || '/';
  const target = new URL(path, targets[service]);

  try {
    // Read the incoming request body
    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const body = Buffer.concat(chunks);

    // Forward the request to the target service
    const upstream = await fetch(target, {
      method: req.method,

      headers: {
        'content-type':
          req.headers['content-type'] || 'application/json',

        accept:
          req.headers.accept || 'application/json',
      },

      body: ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : body,
    });

    // Forward the upstream response
    const text = await upstream.text();

    res.writeHead(upstream.status, {
      'Content-Type':
        upstream.headers.get('content-type') ||
        'application/json',
    });

    res.end(text);
  } catch (error) {
    // Handle upstream service errors
    send(res, 502, {
      error: 'upstream unavailable',
      service,
      detail: error.message,
    });
  }
});

// Start the gateway server
server.listen(port, '0.0.0.0', () => {
  console.log(`oi-gateway listening on ${port}`);
});
