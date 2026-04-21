/**
 * Patreon Auth Middleware Server
 * 
 * This server provides REST API endpoints to call Patreon Auth Middleware CLI tool.
 * 
 * Endpoints:
 * - POST /api/verify - Verify member status
 * - POST /api/verify-tier - Verify specific tier access
 * - POST /api/verify-campaign - Verify campaign membership
 * - POST /api/member-info - Get detailed member information
 * - POST /api/subscription-history - Get subscription history
 * - POST /api/oauth/exchange - Exchange OAuth2 code for token
 * - POST /api/oauth/refresh - Refresh access token
 * - GET /api/health - Health check
 */

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const execPromise = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Get CLI tool path
function getCliPath() {
    // Priority 1: Environment variable
    if (process.env.CLI_PATH) {
        return process.env.CLI_PATH;
    }

    const platform = process.platform;
    // Priority 2: Relative to current directory (assuming it's in the parent project's build folder)
    const rootDir = path.join(__dirname, '..');

    if (platform === 'win32') {
        const winPath = path.join(rootDir, 'build', 'Release', 'patreon_auth_cli.exe');
        if (fs.existsSync(winPath)) {
            return winPath;
        }
        // Fallback to build root
        const fallbackPath = path.join(rootDir, 'build', 'patreon_auth_cli.exe');
        if (fs.existsSync(fallbackPath)) {
            return fallbackPath;
        }
        // Default relative path if nothing exists
        return winPath;
    } else {
        const unixPath = path.join(rootDir, 'build', 'patreon_auth_cli');
        if (fs.existsSync(unixPath)) {
            return unixPath;
        }
        // Fallback
        return path.join(rootDir, 'patreon_auth_cli');
    }
}

const CLI_PATH = getCliPath();

// Helper function to execute CLI command
async function executeCli(args, timeout = 30000) {
    const command = `"${CLI_PATH}" ${args.map(arg => `"${arg}"`).join(' ')}`;

    try {
        const { stdout, stderr } = await execPromise(command, { timeout });
        return {
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: 0
        };
    } catch (error) {
        return {
            success: error.code === 0, // Exit code 0 is success
            stdout: error.stdout ? error.stdout.trim() : '',
            stderr: error.stderr ? error.stderr.trim() : error.message,
            exitCode: error.code || 99
        };
    }
}

// Error handler
function handleError(res, error, statusCode = 500) {
    console.error('Error:', error);
    res.status(statusCode).json({
        success: false,
        error: error.message || 'Internal server error'
    });
}

// Health check
app.get('/api/health', (req, res) => {
    const cliExists = fs.existsSync(CLI_PATH);
    res.json({
        success: true,
        message: 'Server is running',
        cli_path: CLI_PATH,
        cli_exists: cliExists,
        platform: process.platform,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/verify
 * Verify member status
 * Body: { token: string, timeout?: number }
 */
app.post('/api/verify', async (req, res) => {
    try {
        const { token, timeout = 10 } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        const args = ['--user-token', token];
        if (timeout) {
            args.push('--timeout', timeout.toString());
        }

        const result = await executeCli(args, (timeout + 5) * 1000);

        if (result.exitCode === 0) {
            res.json({
                success: true,
                message: 'Member is active',
                data: result.stdout
            });
        } else if (result.exitCode === 1) {
            res.json({
                success: false,
                message: 'Member is not active or not subscribed',
                exitCode: result.exitCode
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.stderr || 'Verification failed',
                exitCode: result.exitCode
            });
        }
    } catch (error) {
        handleError(res, error);
    }
});

/**
 * POST /api/verify-tier
 * Verify specific tier access
 * Body: { token: string, tier_id: number, timeout?: number }
 */
app.post('/api/verify-tier', async (req, res) => {
    try {
        const { token, tier_id, timeout = 10 } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        if (!tier_id || tier_id <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid tier_id is required'
            });
        }

        const args = ['--user-token', token, '--tier', tier_id.toString()];
        if (timeout) {
            args.push('--timeout', timeout.toString());
        }

        const result = await executeCli(args, (timeout + 5) * 1000);

        if (result.exitCode === 0) {
            res.json({
                success: true,
                message: 'User has access to tier',
                tier_id: tier_id,
                data: result.stdout
            });
        } else if (result.exitCode === 1) {
            res.json({
                success: false,
                message: 'User does not have access to tier',
                tier_id: tier_id,
                exitCode: result.exitCode
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.stderr || 'Tier verification failed',
                exitCode: result.exitCode
            });
        }
    } catch (error) {
        handleError(res, error);
    }
});

/**
 * POST /api/verify-campaign
 * Verify campaign membership
 * Body: { token: string, campaign_id: string, timeout?: number }
 */
app.post('/api/verify-campaign', async (req, res) => {
    try {
        const { token, campaign_id, timeout = 10 } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        if (!campaign_id) {
            return res.status(400).json({
                success: false,
                error: 'campaign_id is required'
            });
        }

        const args = ['--user-token', token, '--campaign', campaign_id];
        if (timeout) {
            args.push('--timeout', timeout.toString());
        }

        const result = await executeCli(args, (timeout + 5) * 1000);

        if (result.exitCode === 0) {
            res.json({
                success: true,
                message: 'User is a member of the campaign',
                campaign_id: campaign_id,
                data: result.stdout
            });
        } else if (result.exitCode === 1) {
            res.json({
                success: false,
                message: 'User is not a member of the campaign',
                campaign_id: campaign_id,
                exitCode: result.exitCode
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.stderr || 'Campaign verification failed',
                exitCode: result.exitCode
            });
        }
    } catch (error) {
        handleError(res, error);
    }
});

/**
 * POST /api/member-info
 * Get detailed member information (JSON)
 * Body: { token: string, timeout?: number }
 */
app.post('/api/member-info', async (req, res) => {
    try {
        const { token, timeout = 10 } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        const args = ['--user-token', token, '--info'];
        if (timeout) {
            args.push('--timeout', timeout.toString());
        }

        const result = await executeCli(args, (timeout + 5) * 1000);

        if (result.exitCode === 0) {
            try {
                const jsonData = JSON.parse(result.stdout);
                res.json({
                    success: true,
                    data: jsonData
                });
            } catch (parseError) {
                res.json({
                    success: true,
                    data: result.stdout,
                    warning: 'Response is not valid JSON'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                error: result.stderr || 'Failed to get member info',
                exitCode: result.exitCode
            });
        }
    } catch (error) {
        handleError(res, error);
    }
});

/**
 * POST /api/subscription-history
 * Get subscription history and tenure
 * Body: { token: string, timeout?: number }
 */
app.post('/api/subscription-history', async (req, res) => {
    try {
        const { token, timeout = 10 } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        const args = ['--user-token', token, '--history'];
        if (timeout) {
            args.push('--timeout', timeout.toString());
        }

        const result = await executeCli(args, (timeout + 5) * 1000);

        if (result.exitCode === 0) {
            res.json({
                success: true,
                data: result.stdout
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.stderr || 'Failed to get subscription history',
                exitCode: result.exitCode
            });
        }
    } catch (error) {
        handleError(res, error);
    }
});

/**
 * POST /oauth/exchange
 * OAuth2 code exchange endpoint (called by CLI tool)
 * Body: { code: string, redirect_uri: string }
 */
app.post('/oauth/exchange', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body;

        if (!code) {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'code is required'
            });
        }

        if (!redirect_uri) {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'redirect_uri is required'
            });
        }

        // Get client credentials from environment
        const clientId = process.env.PATREON_CLIENT_ID;
        const clientSecret = process.env.PATREON_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error('Missing PATREON_CLIENT_ID or PATREON_CLIENT_SECRET in environment');
            return res.status(500).json({
                error: 'server_error',
                error_description: 'Server configuration error: missing client credentials'
            });
        }

        console.log('\n[OAuth Exchange] Starting code exchange...');
        console.log(`[OAuth Exchange] Code: ${code.substring(0, 20)}...`);
        console.log(`[OAuth Exchange] Redirect URI: ${redirect_uri}`);
        console.log(`[OAuth Exchange] Client ID: ${clientId.substring(0, 10)}...`);
        console.log(`[OAuth Exchange] Client Secret: ${clientSecret ? clientSecret.substring(0, 5) + '...' : 'MISSING'}`);

        try {
            // Build request body
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirect_uri,
                client_id: clientId,
                client_secret: clientSecret
            });

            console.log('[OAuth Exchange] Making POST request to Patreon...');

            // Exchange code with Patreon API
            const response = await axios.post(
                'https://www.patreon.com/api/oauth2/token',
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 30000
                }
            );

            console.log('[OAuth Exchange] Code exchange successful');
            console.log(`[OAuth Exchange] Access Token: ${response.data.access_token.substring(0, 20)}...`);

            // Return response in format expected by CLI tool
            res.json({
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token || '',
                token_type: response.data.token_type || 'Bearer',
                expires_in: response.data.expires_in || -1,
                scope: response.data.scope || ''
            });
        } catch (error) {
            console.error('\n[OAuth Exchange] ❌ ERROR:');
            console.error('[OAuth Exchange] Status:', error.response?.status);
            console.error('[OAuth Exchange] Status Text:', error.response?.statusText);
            console.error('[OAuth Exchange] Response Data:', JSON.stringify(error.response?.data, null, 2));
            console.error('[OAuth Exchange] Error Message:', error.message);

            if (error.response) {
                const errorData = error.response.data || {};
                const status = error.response.status || 400;

                // Detailed error logging
                if (status === 401) {
                    console.error('[OAuth Exchange] 401 Unauthorized - Possible causes:');
                    console.error('  - Client ID or Client Secret is incorrect');
                    console.error('  - Client Secret is missing or empty');
                    console.error('  - Authorization code is invalid or expired');
                    console.error('  - Redirect URI does not match registered URI');
                }

                // Forward Patreon's error response with detailed description
                res.status(status).json({
                    error: errorData.error || 'invalid_grant',
                    error_description: errorData.error_description || errorData.message || errorData.error || 'Token exchange failed. Check server logs for details.'
                });
            } else {
                console.error('[OAuth Exchange] Network error - could not reach Patreon API');
                res.status(500).json({
                    error: 'server_error',
                    error_description: error.message || 'Failed to connect to Patreon API'
                });
            }
        }
    } catch (error) {
        console.error('Exchange error:', error);
        res.status(500).json({
            error: 'server_error',
            error_description: error.message || 'Internal server error'
        });
    }
});

/**
 * POST /oauth/refresh
 * OAuth2 token refresh endpoint (called by CLI tool)
 * Body: { refresh_token: string }
 */
app.post('/oauth/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'refresh_token is required'
            });
        }

        // Get client credentials from environment
        const clientId = process.env.PATREON_CLIENT_ID;
        const clientSecret = process.env.PATREON_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error('Missing PATREON_CLIENT_ID or PATREON_CLIENT_SECRET in environment');
            return res.status(500).json({
                error: 'server_error',
                error_description: 'Server configuration error: missing client credentials'
            });
        }

        console.log('Refreshing access token with Patreon...');

        try {
            // Refresh token with Patreon API
            const axios = require('axios');
            const response = await axios.post(
                'https://www.patreon.com/api/oauth2/token',
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refresh_token,
                    client_id: clientId,
                    client_secret: clientSecret
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 30000
                }
            );

            console.log('Token refresh successful');

            // Return response in format expected by CLI tool
            res.json({
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token || refresh_token, // Use old if new not provided
                token_type: response.data.token_type || 'Bearer',
                expires_in: response.data.expires_in || -1,
                scope: response.data.scope || ''
            });
        } catch (error) {
            console.error('Patreon API error:', error.response?.data || error.message);

            if (error.response) {
                // Forward Patreon's error response
                res.status(error.response.status).json({
                    error: error.response.data.error || 'invalid_grant',
                    error_description: error.response.data.error_description || error.response.data.message || 'Token refresh failed'
                });
            } else {
                res.status(500).json({
                    error: 'server_error',
                    error_description: error.message || 'Failed to connect to Patreon API'
                });
            }
        }
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({
            error: 'server_error',
            error_description: error.message || 'Internal server error'
        });
    }
});

/**
 * POST /api/oauth/exchange
 * API endpoint for OAuth2 code exchange (alternative interface)
 * Body: { code: string, redirect_uri: string, server_url?: string }
 */
app.post('/api/oauth/exchange', async (req, res) => {
    try {
        const { code, redirect_uri, server_url } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code is required'
            });
        }

        if (!redirect_uri) {
            return res.status(400).json({
                success: false,
                error: 'Redirect URI is required'
            });
        }

        const args = [];
        if (server_url) {
            args.push('--server-url', server_url);
        }
        args.push('--oauth-exchange', code, redirect_uri);

        const result = await executeCli(args, 60000);

        if (result.exitCode === 0) {
            // Parse token response from stdout
            try {
                const lines = result.stdout.split('\n');
                const tokenData = {};

                lines.forEach(line => {
                    if (line.includes('Access Token:')) {
                        tokenData.access_token = line.split('Access Token:')[1].trim();
                    } else if (line.includes('Refresh Token:')) {
                        tokenData.refresh_token = line.split('Refresh Token:')[1].trim();
                    } else if (line.includes('Token Type:')) {
                        tokenData.token_type = line.split('Token Type:')[1].trim();
                    } else if (line.includes('Expires In:')) {
                        const expiresStr = line.split('Expires In:')[1].trim();
                        tokenData.expires_in = parseInt(expiresStr.split(' ')[0]);
                    }
                });

                res.json({
                    success: true,
                    data: tokenData
                });
            } catch (parseError) {
                res.json({
                    success: true,
                    data: result.stdout,
                    warning: 'Could not parse token response'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                error: result.stderr || 'Token exchange failed',
                exitCode: result.exitCode
            });
        }
    } catch (error) {
        handleError(res, error);
    }
});

/**
 * POST /api/oauth/refresh
 * Refresh access token using refresh token
 * Body: { refresh_token: string, server_url?: string }
 */
app.post('/api/oauth/refresh', async (req, res) => {
    try {
        const { refresh_token, server_url } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        const args = [];
        if (server_url) {
            args.push('--server-url', server_url);
        }
        args.push('--oauth-refresh', refresh_token);

        const result = await executeCli(args, 60000);

        if (result.exitCode === 0) {
            // Parse token response from stdout
            try {
                const lines = result.stdout.split('\n');
                const tokenData = {};

                lines.forEach(line => {
                    if (line.includes('Access Token:')) {
                        tokenData.access_token = line.split('Access Token:')[1].trim();
                    } else if (line.includes('Refresh Token:')) {
                        tokenData.refresh_token = line.split('Refresh Token:')[1].trim();
                    } else if (line.includes('Token Type:')) {
                        tokenData.token_type = line.split('Token Type:')[1].trim();
                    } else if (line.includes('Expires In:')) {
                        const expiresStr = line.split('Expires In:')[1].trim();
                        tokenData.expires_in = parseInt(expiresStr.split(' ')[0]);
                    }
                });

                res.json({
                    success: true,
                    data: tokenData
                });
            } catch (parseError) {
                res.json({
                    success: true,
                    data: result.stdout,
                    warning: 'Could not parse token response'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                error: result.stderr || 'Token refresh failed',
                exitCode: result.exitCode
            });
        }
    } catch (error) {
        handleError(res, error);
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /api/health',
            'POST /api/verify',
            'POST /api/verify-tier',
            'POST /api/verify-campaign',
            'POST /api/member-info',
            'POST /api/subscription-history',
            'POST /api/oauth/exchange',
            'POST /api/oauth/refresh'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Patreon Auth Middleware API Server`);
    console.log(`==========================================`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`CLI Tool Path: ${CLI_PATH}`);
    console.log(`CLI Tool Exists: ${fs.existsSync(CLI_PATH) ? '✅ Yes' : '❌ No'}`);

    // Check for OAuth credentials
    const hasClientId = !!process.env.PATREON_CLIENT_ID;
    const hasClientSecret = !!process.env.PATREON_CLIENT_SECRET;
    console.log(`OAuth Credentials: ${hasClientId && hasClientSecret ? '✅ Set' : '❌ Missing'}`);
    if (!hasClientId || !hasClientSecret) {
        console.log(`  ⚠️  Warning: Set PATREON_CLIENT_ID and PATREON_CLIENT_SECRET in .env for OAuth2 to work`);
    }

    console.log(`\nAvailable Endpoints:`);
    console.log(`  GET  /api/health`);
    console.log(`  POST /api/verify`);
    console.log(`  POST /api/verify-tier`);
    console.log(`  POST /api/verify-campaign`);
    console.log(`  POST /api/member-info`);
    console.log(`  POST /api/subscription-history`);
    console.log(`  POST /oauth/exchange (for CLI tool)`);
    console.log(`  POST /oauth/refresh (for CLI tool)`);
    console.log(`  POST /api/oauth/exchange (API interface)`);
    console.log(`  POST /api/oauth/refresh (API interface)`);
    console.log(`\nPress Ctrl+C to stop\n`);
});

