import server from '../dist/server/server.js';

export default async function handler(req, res) {
  // Convert Node IncomingMessage to Web Request
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  let url;
  try {
    url = new URL(req.url, `${protocol}://${host}`);
  } catch (e) {
    url = new URL('/', `${protocol}://${host}`);
  }
  
  const headers = new Headers();
  for (const key in req.headers) {
    if (req.headers[key] !== undefined) {
      if (Array.isArray(req.headers[key])) {
        req.headers[key].forEach(v => headers.append(key, v));
      } else {
        headers.set(key, req.headers[key]);
      }
    }
  }

  const init = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    init.body = Buffer.concat(chunks);
  }

  let request;
  try {
    request = new Request(url.href, init);
  } catch (e) {
    res.statusCode = 500;
    return res.end("Failed to instantiate Web Request: " + e.message);
  }
  
  // Execute TanStack Server logic
  let response;
  try {
    response = await server.fetch(request);
  } catch (err) {
    console.error("Server Fetch Error:", err);
    res.statusCode = 500;
    return res.end("Internal Server Error: " + err.message);
  }

  // Convert Web Response back to Node ServerResponse
  res.statusCode = response.status || 200;
  res.statusMessage = response.statusText || 'OK';

  response.headers.forEach((value, key) => {
    // Skip setting generic edge/cloudflare headers that might conflict or duplicate
    res.setHeader(key, value);
  });

  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  
  res.end();
}
