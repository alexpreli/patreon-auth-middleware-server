/**
 * OAuth2 Callback Server
 * 
 * This simple server receives the callback from Patreon OAuth2
 * and displays the authorization code or error.
 * 
 * Usage:
 *   node oauth-server.js
 * 
 * Then use redirect_uri: http://localhost:8080/callback
 */

const http = require('http');
const url = require('url');

const PORT = 8080;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (pathname === '/callback') {
        // Handle OAuth2 callback
        if (query.code) {
            // Success - authorization code received
            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAuth2 Callback - Success</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #28a745;
            margin-bottom: 20px;
        }
        .code-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            word-break: break-all;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
        .button {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
        }
        .button:hover {
            background: #0056b3;
        }
        .info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        pre {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>✅ OAuth2 Authorization Successful!</h1>
        
        <div class="info">
            <strong>Authorization Code:</strong>
            <div class="code-box" id="auth-code">${query.code}</div>
        </div>

        <h2>Next Steps:</h2>
        <ol>
            <li>Copy the authorization code above</li>
            <li>Use it to exchange for an access token:</li>
        </ol>

        <div class="info">
            <strong>Exchange Code for Token:</strong>
            <pre id="exchange-command" class="code-box">patreon_auth_cli --server-url http://localhost:3000 --oauth-exchange "${query.code}" http://localhost:8080/callback</pre>
        </div>

        <div class="info">
            <strong>Or use the test server API:</strong>
            <pre>POST http://localhost:3000/api/oauth/exchange
{
  "code": "${query.code}",
  "redirect_uri": "http://localhost:8080/callback"
}</pre>
        </div>

        <h2>Full URL Received:</h2>
        <div class="code-box" style="font-size: 12px;">${req.url}</div>

        <p style="margin-top: 30px; color: #666;">
            <small>You can close this window. The authorization code is displayed above.</small>
        </p>
    </div>

    <script>
        function selectElementText(element) {
            const range = document.createRange();
            range.selectNodeContents(element);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }

        async function copyFromElement(element) {
            const text = element.textContent.trim();
            try {
                await navigator.clipboard.writeText(text);
                const originalTitle = element.title;
                element.title = 'Copied!';
                setTimeout(() => {
                    element.title = originalTitle || '';
                }, 1200);
            } catch (error) {
                // Clipboard can fail on some browser security settings.
                console.warn('Clipboard copy failed:', error);
            }
        }

        // Select + copy authorization code on click
        document.getElementById('auth-code').addEventListener('click', async function() {
            selectElementText(this);
            await copyFromElement(this);
        });

        // Select + copy exchange command on click
        document.getElementById('exchange-command').addEventListener('click', async function() {
            selectElementText(this);
            await copyFromElement(this);
        });
    </script>
</body>
</html>
            `;
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            
            console.log('\n✅ OAuth2 Callback Received!');
            console.log('================================');
            console.log('Authorization Code:', query.code);
            console.log('\nNext step: Exchange code for token');
            console.log('Command:');
            console.log(`patreon_auth_cli.exe --server-url http://localhost:3000 --oauth-exchange ${query.code} http://localhost:8080/callback`);
            console.log('\n');
        } else if (query.error) {
            // Error from OAuth2
            const isAccessDenied = query.error === 'access_denied' || query.error === 'user_denied';
            const errorMessage = isAccessDenied 
                ? 'User denied authorization' 
                : query.error;
            const errorDescription = query.error_description || (isAccessDenied ? 'The user chose not to authorize the application.' : '');
            
            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAuth2 Callback - Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #dc3545;
            margin-bottom: 20px;
        }
        .error-box {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>❌ OAuth2 Authorization Failed</h1>
        <div class="error-box">
            <strong>Error:</strong> ${errorMessage}
            ${errorDescription ? `<br><strong>Description:</strong> ${errorDescription}` : ''}
        </div>
        <p>Please try again.</p>
    </div>
</body>
</html>
            `;
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            
            console.log('\n❌ OAuth2 Callback Error!');
            console.log('=========================');
            if (isAccessDenied) {
                console.log('User denied authorization');
            } else {
                console.log('Error:', query.error);
            }
            if (errorDescription) {
                console.log('Description:', errorDescription);
            }
            console.log('\n');
        } else {
            // No code or error - check if there are any query parameters that might indicate denial
            // Sometimes Patreon might redirect without explicit error parameter
            const hasQueryParams = Object.keys(query).length > 0;
            const message = hasQueryParams 
                ? 'No authorization code or error received. The user may have denied authorization.'
                : 'No authorization code or error received.';
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>OAuth2 Callback</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
        }
    </style>
</head>
<body>
    <h1>OAuth2 Callback Server</h1>
    <p>Waiting for OAuth2 callback from Patreon...</p>
    <p>${message}</p>
</body>
</html>
            `);
            
            if (hasQueryParams) {
                console.log('\n⚠️  OAuth2 Callback Received (no code/error)');
                console.log('==============================================');
                console.log('Query parameters:', JSON.stringify(query, null, 2));
                console.log('User may have denied authorization.');
                console.log('\n');
            }
        }
    } else if (pathname === '/') {
        // Root path - show instructions
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>OAuth2 Callback Server</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        pre {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 OAuth2 Callback Server</h1>
        <p>The server is running and waiting for the callback from Patreon OAuth2.</p>
        
        <h2>Status:</h2>
        <p style="color: green; font-weight: bold;">✅ Server running on port ${PORT}</p>
        
        <h2>Next Steps:</h2>
        <ol>
            <li>Use redirect_uri: <code>http://localhost:8080/callback</code></li>
            <li>Authorize the application on Patreon</li>
            <li>The authorization code will be displayed in the browser</li>
        </ol>

        <h2>Example OAuth2 URL:</h2>
        <pre>https://www.patreon.com/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:8080/callback&scope=identity+identity.memberships</pre>
    </div>
</body>
</html>
        `);
    } else {
        // 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log('\n🚀 OAuth2 Callback Server Started!');
    console.log('====================================');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Callback URL: http://localhost:${PORT}/callback`);
    console.log('\nWaiting for OAuth2 callback from Patreon...');
    console.log('Press Ctrl+C to stop\n');
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n\nShutting down OAuth2 Callback Server...');
    server.close(() => {
        console.log('Server stopped.');
        process.exit(0);
    });
});

