/**
 * Security Middleware
 *
 * Implements a basic "block" list for common malicious scanning patterns.
 * Returns 403 Forbidden immediately to signal to bots to stop.
 */

import { Context, Next } from "hono";

const MALICIOUS_PATTERNS = [
    /\/\.\.\//,         // Path traversal (../../.env)
    /\/\.env/,          // Env file access
    /wp-config\.php/,   // WordPress config
    /etc\/passwd/,      // Linux passwd file
    /proc\/self/,       // Linux process environment
    /\.git\/config/,    // Git config access
    /package\.json/,    // Node.js package info
    /docker-compose/,   // Docker info
    /v1\/@fs/,          // Vite dev server exposure (common scan)
    /pdf\?src=/,        // PDF generator exploits
    /wc-api/            // WooCommerce exploits
];

export const securityMiddleware = async (c: Context, next: Next) => {
    const url = c.req.url;

    const isMalicious = MALICIOUS_PATTERNS.some(pattern => pattern.test(url));

    if (isMalicious) {
        // Log the block to CLI (for debugging)
        console.warn(`[🛡️  Security] Blocked malicious scan: ${c.req.method} ${c.req.path}`);

        // Return 403 Forbidden - more firm than 404
        return c.json({
            success: false,
            error: "Forbidden"
        }, 403);
    }

    await next();
};
