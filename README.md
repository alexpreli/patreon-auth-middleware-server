# Patreon Auth Middleware Server

Server for Patreon Auth Middleware CLI tool.

## Installation

```bash
cd /path/to/project-folder
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env`
```bash
PATREON_CLIENT_ID=your_client_id
PATREON_CLIENT_SECRET=your_client_secret
PORT=3000
```

## Running

### Start Patreon Auth Middleware Server
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000` (or the port specified in `.env`).

### OAuth2 Callback Server

To receive the callback from Patreon OAuth2, you need to start the callback server on port 8080:

```bash
# In a separate terminal
npm run oauth-callback
```

Or directly:
```bash
node oauth-server.js
```

This server will run on `http://localhost:8080` and will display the authorization code when Patreon redirects the user back.

**Important:** You must start **both servers**:
1. Patreon Auth Middleware Server (port 3000) - for API endpoints
2. OAuth2 Callback Server (port 8080) - to receive the callback from Patreon

## API Endpoints

### Health Check
```
GET /api/health
```
Checks if the server is running and if the CLI tool is available.

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "cli_path": "...",
  "cli_exists": true,
  "platform": "win32",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Verify Member
```
POST /api/verify
```
Verifies if a user is an active Patreon member.

**Body:**
```json
{
  "token": "PATRON_ACCESS_TOKEN",
  "timeout": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Member is active",
  "data": "..."
}
```

### Verify Tier Access
```
POST /api/verify-tier
```
Verifies if the user has access to a specific tier.

**Body:**
```json
{
  "token": "PATRON_ACCESS_TOKEN",
  "tier_id": 12345,
  "timeout": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "User has access to tier",
  "tier_id": 12345,
  "data": "..."
}
```

### Verify Campaign
```
POST /api/verify-campaign
```
Verifies if the user is a member of a specific campaign.

**Body:**
```json
{
  "token": "PATRON_ACCESS_TOKEN",
  "campaign_id": "campaign_123",
  "timeout": 10
}
```

### Get Member Info
```
POST /api/member-info
```
Gets detailed information about the member (JSON).

**Body:**
```json
{
  "token": "PATRON_ACCESS_TOKEN",
  "timeout": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // JSON with member information
  }
}
```

### Get Subscription History
```
POST /api/subscription-history
```
Gets subscription history and membership tenure.

**Body:**
```json
{
  "token": "PATRON_ACCESS_TOKEN",
  "timeout": 10
}
```

### OAuth2 Exchange
```
POST /api/oauth/exchange
```
Exchanges an OAuth2 authorization code for an access token.

**Body:**
```json
{
  "code": "AUTHORIZATION_CODE",
  "redirect_uri": "http://localhost:8080/callback",
  "server_url": "https://your-server.com" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

### OAuth2 Refresh
```
POST /api/oauth/refresh
```
Refreshes an access token using a refresh token.

**Body:**
```json
{
  "refresh_token": "REFRESH_TOKEN",
  "server_url": "https://your-server.com" // optional
}
```

## Using with cURL

### Verify Member
```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN"}'
```

### Verify Tier
```bash
curl -X POST http://localhost:3000/api/verify-tier \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "tier_id": 12345}'
```

### Get Member Info
```bash
curl -X POST http://localhost:3000/api/member-info \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN"}'
```

### Get Subscription History
```bash
curl -X POST http://localhost:3000/api/subscription-history \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN"}'
```

## Setting Environment Variables

### Windows (PowerShell)
```powershell
# Set environment variable (current session)
$env:PATREON_CLIENT_ID="your_client_id"
$env:TEST_TOKEN="your_test_token"

# Permanent setting (for user)
[System.Environment]::SetEnvironmentVariable("PATREON_CLIENT_ID", "your_client_id", "User")
```

### Windows (CMD)
```cmd
set PATREON_CLIENT_ID=your_client_id
set TEST_TOKEN=your_test_token
```

### Linux/Mac (Bash)
```bash
export PATREON_CLIENT_ID="your_client_id"
export TEST_TOKEN="your_test_token"
```

## Using with JavaScript/TypeScript

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Verify member
async function testVerify() {
  const response = await axios.post(`${API_BASE}/verify`, {
    token: 'YOUR_TOKEN'
  });
  console.log(response.data);
}

// Verify tier
async function testVerifyTier() {
  const response = await axios.post(`${API_BASE}/verify-tier`, {
    token: 'YOUR_TOKEN',
    tier_id: 12345
  });
  console.log(response.data);
}

// Get member info
async function testMemberInfo() {
  const response = await axios.post(`${API_BASE}/member-info`, {
    token: 'YOUR_TOKEN'
  });
  console.log(response.data);
}
```

## Using with Postman

1. Import the request collection
2. Set environment variables:
   - `base_url`: `http://localhost:3000`
   - `token`: Your test token
3. Run requests individually or all at once

## Notes

- Make sure the CLI tool is compiled before running the server
- The token must be the patron's token (obtained via OAuth2), not the creator's token
- All endpoints return JSON
- The default timeout is 10 seconds, but it can be configured in the request

## Troubleshooting

### CLI tool not found
Check that the CLI tool is compiled and located in:
- Windows: `../build/Release/patreon_auth_cli.exe`
- Linux: `../build/patreon_auth_cli`

### Port already in use
Change the port in `.env` or stop the process using the port.

### Timeout errors
Increase the timeout in the request or check your internet connection.
