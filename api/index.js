let handler;

try {
  // Use absolute-like path or relative path - Vercel tracing might need this to be dynamic to catch the error
  const serverModule = await import('../dist/server/server.js').catch(err => {
    throw new Error("Module Import Failed: " + err.message);
  });
  const server = serverModule.default || serverModule;

  handler = async function (req, res) {
    try {
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
        if (!server || typeof server.fetch !== 'function') {
          throw new Error("Server fetch is not a function. Server object type: " + typeof server);
        }
        response = await server.fetch(request);
      } catch (err) {
        console.error("Server Fetch Error:", err);
        res.statusCode = 500;
        return res.end("Internal Server Error: " + err.message + "\n" + err.stack);
      }

      // Convert Web Response back to Node ServerResponse
      res.statusCode = response.status || 200;
      res.statusMessage = response.statusText || 'OK';

      // SAFELY HANDLE SET-COOKIE HEADERS
      if (typeof response.headers.getSetCookie === 'function') {
        const cookies = response.headers.getSetCookie();
        if (cookies.length > 0) {
          res.setHeader('Set-Cookie', cookies);
        }
      } else {
        const cookieString = response.headers.get('Set-Cookie');
        if (cookieString) res.setHeader('Set-Cookie', cookieString);
      }

      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
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
    } catch (handlerErr) {
      console.error("Global Handler Error:", handlerErr);
      res.statusCode = 500;
      res.end("Critical Handler Error: " + handlerErr.message + "\n" + handlerErr.stack);
    }
  };
} catch (importErr) {
  console.error("Failed to import server:", importErr);
  handler = async function (req, res) {
    let files = [];
    try {
      const fs = await import('fs');
      const path = await import('path');
      const listDir = (dir) => {
        try {
          return fs.readdirSync(dir).map(f => {
            const full = path.join(dir, f);
            return fs.statSync(full).isDirectory() ? f + '/' : f;
          });
        } catch (e) { return [e.message]; }
      };
      files = {
        cwd: process.cwd(),
        taskDir: listDir('/var/task'),
        rootFiles: listDir('.'),
        distFiles: listDir('./dist')
      };
    } catch (e) { files = "Failed to list files: " + e.message; }

    res.statusCode = 500;
    res.end("Failed to initialize server: " + importErr.message + "\n" + importErr.stack + "\n\nFiles present:\n" + JSON.stringify(files, null, 2));
  };
}

export default handler;
