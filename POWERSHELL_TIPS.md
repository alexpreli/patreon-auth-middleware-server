# PowerShell Tips for Patreon Auth Middleware

## Common Issues and Solutions

### 1. Line Continuation in Command

**Problem:** You used `\` (backslash) for line continuation.

**Error:**
```
Error: Unknown option '\'
```

**Solution:** In PowerShell, use backtick `` ` `` (not backslash `\`):

```powershell
# ❌ WRONG (bash/Linux syntax)
./patreon_auth_cli --server-url http://localhost:3000 \
    --oauth-start CLIENT_ID \
    http://localhost:8080/callback

# ✅ CORRECT - Use backtick
./patreon_auth_cli --server-url http://localhost:3000 `
    --oauth-start CLIENT_ID `
    http://localhost:8080/callback

# ✅ CORRECT - Or everything on one line (simpler)
./patreon_auth_cli --server-url http://localhost:3000 --oauth-start CLIENT_ID http://localhost:8080/callback
```

**Important:** The backtick `` ` `` must be the last character on the line (no spaces after it).

### 2. Setting Environment Variables

**Problem:** You used `export` which is for bash/Linux.

**Error:**
```
export : The term 'export' is not recognized
```

**Solution:** Use `$env:` in PowerShell:

```powershell
# ❌ WRONG
export PATREON_CLIENT_ID="value"

# ✅ CORRECT
$env:PATREON_CLIENT_ID="your_client_id"
$env:TEST_TOKEN="your_token"
```

### 3. Executing CLI Tool

**Full example for OAuth2:**

```powershell
# Set variables
$env:PATREON_CLIENT_ID="your_client_id"

# Navigate to the CLI tool folder
cd build\Release

# Start OAuth2 flow (all on one line)
.\patreon_auth_cli.exe --server-url http://localhost:3000 --oauth-start $env:PATREON_CLIENT_ID http://localhost:8080/callback

# Or with backtick for line continuation
.\patreon_auth_cli.exe --server-url http://localhost:3000 `
    --oauth-start $env:PATREON_CLIENT_ID `
    http://localhost:8080/callback
```

### 4. Member Verification

```powershell
# Simple verification
.\patreon_auth_cli.exe --user-token "YOUR_TOKEN"

# Verification with tier
.\patreon_auth_cli.exe --user-token "YOUR_TOKEN" --tier 12345

# Get member information
.\patreon_auth_cli.exe --user-token "YOUR_TOKEN" --info
```

### 5. Testing with Test Server

```powershell
# Navigate to test-server
cd ..\test-server

# Install dependencies
npm install

# Start the server
npm start

# In another terminal, test
npm test $env:TEST_TOKEN
```

### 6. Comparative Syntax

| Operation | Bash/Linux | PowerShell |
|----------|------------|------------|
| Line continuation | `\` | `` ` `` (backtick) |
| Env variables | `export VAR="value"` | `$env:VAR="value"` |
| Execution | `./script` | `.\script.exe` |
| Path separator | `/` | `\` or `/` |
| Echo variable | `echo $VAR` | `echo $env:VAR` |

### 7. Complete Examples

#### Full OAuth2 Flow

```powershell
# 1. Set variables
$env:PATREON_CLIENT_ID="your_client_id"
$env:REDIRECT_URI="http://localhost:8080/callback"

# 2. Start OAuth2 (opens browser)
.\patreon_auth_cli.exe --server-url http://localhost:3000 --oauth-start $env:PATREON_CLIENT_ID $env:REDIRECT_URI

# 3. After authorization, copy code from URL and exchange
.\patreon_auth_cli.exe --server-url http://localhost:3000 --oauth-exchange "AUTHORIZATION_CODE" $env:REDIRECT_URI

# 4. Use obtained token for verification
.\patreon_auth_cli.exe --user-token "ACCESS_TOKEN_FROM_STEP_3"
```

#### Testing with cURL in PowerShell

```powershell
# Use Invoke-WebRequest or curl (Windows 10+)
$body = @{
    token = "YOUR_TOKEN"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/verify" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

## Tips

1. **Use backtick for long lines:** The backtick `` ` `` allows continuing commands on multiple lines.
2. **Check for spaces:** The backtick must be the last character (no spaces after).
3. **Use quotes for tokens:** Tokens can contain special characters, use quotes.
4. **Variables with $env:** All environment variables in PowerShell use the `$env:` prefix.
5. **Relative paths:** Use `.\` for executables in the current folder.

## Resources

- [PowerShell Documentation](https://docs.microsoft.com/powershell/)
- [PowerShell Continuation](https://docs.microsoft.com/powershell/module/microsoft.powershell.core/about/about_line_editing)
