# Troubleshooting Guide

## Common Problems

### 1. **PATREON_CLIENT_SECRET not set**
   - **Symptoms:** 401 Unauthorized errors during OAuth exchange.
   - **Solution:** 
     - Check that `.env` contains `PATREON_CLIENT_SECRET=your_secret`.
     - Ensure the secret matches exactly what's in the Patreon Developer Portal.

### 2. **Invalid Redirect URI**
   - **Symptoms:** "invalid_redirect_uri" error from Patreon.
   - **Solution:**
     - The redirect URI must EXACTLY match the one registered on Patreon (including `http://` and trailing slashes).
     - Standard: `http://localhost:8080/callback`.

### 3. **CLI Tool Not Found**
   - **Symptoms:** `spawn ... ENOENT` error in server logs.
   - **Solution:**
     - Check that the `patreon_auth_cli.exe` is compiled.
     - Check the path in `patreon-api-server.js` or set `CLI_PATH` in `.env`.

### 4. **Port Already in Use**
   - **Symptoms:** `EADDRINUSE` error when starting the server.
   - **Solution:**
     - Change the port in `.env` (e.g., `PORT=3001`).
     - Or stop the process using that port.

## OAuth2 Flow Troubleshooting

### Step 1: Authorization
If the browser shows an error after clicking "Allow":
- Check `client_id` in the URL.
- Check `redirect_uri` in the URL.
- Check that the `oauth-server.js` is running on port 8080.

### Step 2: Code Exchange
If the server logs show an error during exchange:
- Check `PATREON_CLIENT_ID` and `PATREON_CLIENT_SECRET`.
- Check if the authorization code has expired (it lasts about 10 minutes).
- Check the redirect URI.

## Logging

The server provides detailed logs for OAuth2 operations:
- `[OAuth Exchange] Starting code exchange...`
- `[OAuth Exchange] Code exchange successful`
- `[OAuth Exchange] ❌ ERROR:` - shows the exact response from Patreon.

## Environment Variables

### How to check if they are set:

**Windows PowerShell:**
```powershell
dir env:PATREON*
```

**Windows CMD:**
```cmd
set PATREON
```

**Linux/Mac:**
```bash
env | grep PATREON
```

### How to set them permanently:

**Windows:**
1. Open "Edit the system environment variables".
2. Click "Environment Variables".
3. Add a new User variable.

## Still having issues?

1. Check the console output of both servers.
2. Ensure you are using a Patron access token, not a Creator token.
3. Verify your internet connection.
4. Try restarting both servers.
