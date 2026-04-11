/**
 * File: src/utils/SecurityValidator.js
 * Description: Security validation utilities for SSRF protection, open redirect prevention,
 *              and other security-related validations.
 *
 * Author: iBUHUB
 */

const dns = require("dns").promises;
const path = require("path");
const fs = require("fs");

// Singleton for loaded security config
let securityConfig = null;

/**
 * Load security configuration from configs/security.json
 * Environment variables override config file settings.
 * @returns {Object} Security configuration object
 */
function loadSecurityConfig() {
    if (securityConfig) {
        return securityConfig;
    }

    // Default configuration (backward compatible)
    const defaultConfig = {
        logFilter: {
            enabled: true,
            sensitiveFields: [
                "password",
                "token",
                "apiKey",
                "api_key",
                "authorization",
                "cookie",
                "session",
                "secret",
                "credential",
            ],
        },
        openRedirect: {
            allowedRedirectDomains: [],
            enabled: false,
        },
        ssrf: {
            allowedDomains: [],
            allowedProtocols: ["https"],
            allowPrivateIPs: true,
            blockedDomains: [],
            enabled: false,
        },
    };

    try {
        const configPath = path.join(process.cwd(), "configs", "security.json");
        if (fs.existsSync(configPath)) {
            const fileContent = fs.readFileSync(configPath, "utf8");
            const fileConfig = JSON.parse(fileContent);

            // Merge with defaults
            securityConfig = {
                logFilter: { ...defaultConfig.logFilter, ...fileConfig.logFilter },
                openRedirect: { ...defaultConfig.openRedirect, ...fileConfig.openRedirect },
                ssrf: { ...defaultConfig.ssrf, ...fileConfig.ssrf },
            };
        } else {
            securityConfig = defaultConfig;
        }
    } catch (error) {
        console.error(`[SecurityValidator] Failed to load security config: ${error.message}`);
        securityConfig = defaultConfig;
    }

    // Apply environment variable overrides
    if (process.env.SSRF_ENABLED !== undefined) {
        securityConfig.ssrf.enabled = process.env.SSRF_ENABLED === "true";
    }
    if (process.env.SSRF_ALLOW_PRIVATE_IPS !== undefined) {
        securityConfig.ssrf.allowPrivateIPs = process.env.SSRF_ALLOW_PRIVATE_IPS === "true";
    }
    if (process.env.OPEN_REDIRECT_ENABLED !== undefined) {
        securityConfig.openRedirect.enabled = process.env.OPEN_REDIRECT_ENABLED === "true";
    }
    if (process.env.LOG_FILTER_ENABLED !== undefined) {
        securityConfig.logFilter.enabled = process.env.LOG_FILTER_ENABLED === "true";
    }

    return securityConfig;
}

/**
 * Get the current security configuration
 * @returns {Object} Security configuration object
 */
function getSecurityConfig() {
    return loadSecurityConfig();
}

/**
 * Reset the security config (useful for testing)
 */
function resetSecurityConfig() {
    securityConfig = null;
}

/**
 * Check if an IP address is in a private/CIDR range
 * @param {string} ip - IP address to check
 * @returns {boolean} True if IP is private
 */
function isPrivateIP(ip) {
    // IPv4 private ranges
    const privateIPv4Ranges = [
        // 10.0.0.0/8
        { end: "10.255.255.255", start: "10.0.0.0" },
        // 172.16.0.0/12
        { end: "172.31.255.255", start: "172.16.0.0" },
        // 192.168.0.0/16
        { end: "192.168.255.255", start: "192.168.0.0" },
        // 127.0.0.0/8 (loopback)
        { end: "127.255.255.255", start: "127.0.0.0" },
        // 169.254.0.0/16 (link-local)
        { end: "169.254.255.255", start: "169.254.0.0" },
        // 0.0.0.0/8 (current network)
        { end: "0.255.255.255", start: "0.0.0.0" },
    ];

    // IPv6 private/reserved ranges (simplified check)
    const privateIPv6Prefixes = [
        "fc", // unique local fc00::/7
        "fd", // unique local fd00::/7
        "fe80", // link-local fe80::/10
    ];

    // Check IPv6
    if (ip.includes(":")) {
        const normalizedIP = ip.toLowerCase();

        // Check for loopback ::1
        if (normalizedIP === "::1" || normalizedIP === "0:0:0:0:0:0:0:1") {
            return true;
        }

        // Check for unspecified address ::
        if (normalizedIP === "::" || normalizedIP === "0:0:0:0:0:0:0:0") {
            return true;
        }

        // Check for prefixes
        for (const prefix of privateIPv6Prefixes) {
            if (normalizedIP.startsWith(prefix.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    // Check IPv4
    const ipNum = ipv4ToNumber(ip);
    if (ipNum === null) {
        return false;
    }

    for (const range of privateIPv4Ranges) {
        const startNum = ipv4ToNumber(range.start);
        const endNum = ipv4ToNumber(range.end);
        if (ipNum >= startNum && ipNum <= endNum) {
            return true;
        }
    }

    // Check for cloud metadata addresses
    const metadataIPs = ["169.254.169.254"];
    if (metadataIPs.includes(ip)) {
        return true;
    }

    return false;
}

/**
 * Convert IPv4 address to number
 * @param {string} ip - IPv4 address
 * @returns {number|null} Numeric representation or null if invalid
 */
function ipv4ToNumber(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) {
        return null;
    }

    let num = 0;
    for (let i = 0; i < 4; i++) {
        const part = parseInt(parts[i], 10);
        if (isNaN(part) || part < 0 || part > 255) {
            return null;
        }
        num = num * 256 + part;
    }

    return num;
}

/**
 * Validate an image URL for SSRF protection
 * @param {string} urlString - URL to validate
 * @returns {Promise<{valid: boolean, reason?: string}>} Validation result
 */
async function validateImageUrl(urlString) {
    const config = loadSecurityConfig();

    // If SSRF protection is disabled, allow all URLs
    if (!config.ssrf.enabled) {
        return { valid: true };
    }

    // Parse URL
    let url;
    try {
        url = new URL(urlString);
    } catch (error) {
        return { reason: "Invalid URL format", valid: false };
    }

    // Protocol check
    const protocol = url.protocol.replace(":", "").toLowerCase();
    if (!config.ssrf.allowedProtocols.includes(protocol)) {
        return { reason: `Protocol '${protocol}' not allowed`, valid: false };
    }

    // Domain blocklist check
    const hostname = url.hostname.toLowerCase();
    if (config.ssrf.blockedDomains.length > 0) {
        for (const blocked of config.ssrf.blockedDomains) {
            if (hostname === blocked || hostname.endsWith("." + blocked)) {
                return { reason: `Domain '${hostname}' is blocked`, valid: false };
            }
        }
    }

    // Domain whitelist check
    if (config.ssrf.allowedDomains.length > 0) {
        let isAllowed = false;
        for (const allowed of config.ssrf.allowedDomains) {
            if (hostname === allowed || hostname.endsWith("." + allowed)) {
                isAllowed = true;
                break;
            }
        }
        if (!isAllowed) {
            return { reason: `Domain '${hostname}' is not in whitelist`, valid: false };
        }
    }

    // Private IP check (with DNS resolution for DNS rebinding protection)
    if (!config.ssrf.allowPrivateIPs) {
        // Check hostname directly (could be an IP)
        if (isPrivateIP(hostname)) {
            return { reason: "Private IP addresses are not allowed", valid: false };
        }

        // DNS resolution to prevent DNS rebinding attacks
        try {
            const addresses = await dns.resolve4(hostname).catch(() => []);
            const ipv6Addresses = await dns.resolve6(hostname).catch(() => []);
            const allAddresses = [...addresses, ...ipv6Addresses];

            for (const addr of allAddresses) {
                if (isPrivateIP(addr)) {
                    return {
                        reason: `Resolved IP '${addr}' is a private address`,
                        valid: false,
                    };
                }
            }
        } catch (error) {
            // DNS resolution failed - could be a temporary network issue
            // Log but don't block to avoid breaking legitimate requests
            console.warn(`[SecurityValidator] DNS resolution failed for ${hostname}: ${error.message}`);
        }
    }

    return { valid: true };
}

/**
 * Validate a redirect URL for open redirect protection
 * @param {string} urlString - URL to validate
 * @returns {{valid: boolean, reason?: string}} Validation result
 */
function validateRedirectUrl(urlString) {
    const config = loadSecurityConfig();

    // If open redirect protection is disabled, allow all URLs
    if (!config.openRedirect.enabled) {
        return { valid: true };
    }

    // Relative URLs are always allowed
    if (urlString.startsWith("/") && !urlString.startsWith("//")) {
        return { valid: true };
    }

    // Parse absolute URL
    let url;
    try {
        url = new URL(urlString, "http://localhost");
    } catch (error) {
        return { reason: "Invalid URL format", valid: false };
    }

    // Check if URL uses a safe protocol
    const protocol = url.protocol.replace(":", "").toLowerCase();
    if (!["http", "https"].includes(protocol)) {
        return { reason: `Protocol '${protocol}' not allowed for redirects`, valid: false };
    }

    // Check domain whitelist
    const hostname = url.hostname.toLowerCase();
    if (config.openRedirect.allowedRedirectDomains.length === 0) {
        return { reason: "No redirect domains whitelisted", valid: false };
    }

    let isAllowed = false;
    for (const allowed of config.openRedirect.allowedRedirectDomains) {
        if (hostname === allowed || hostname.endsWith("." + allowed)) {
            isAllowed = true;
            break;
        }
    }

    if (!isAllowed) {
        return { reason: `Domain '${hostname}' is not whitelisted for redirects`, valid: false };
    }

    return { valid: true };
}

/**
 * Sanitize a message by redacting sensitive field values
 * @param {string} message - Message to sanitize
 * @returns {string} Sanitized message
 */
function sanitizeMessage(message) {
    const config = loadSecurityConfig();

    if (!config.logFilter?.enabled) {
        return message;
    }

    const fields = config.logFilter.sensitiveFields || [];
    let sanitized = String(message);

    for (const field of fields) {
        // Pattern 1: JSON-like format: "field": "value" or 'field': 'value'
        // Pattern 2: Key-value format: field=value or field: value
        const patterns = [
            // JSON format: "apiKey": "value" or 'apiKey': 'value'
            new RegExp(`("${field}"\\s*:\\s*")[^"]*(")`, "gi"),
            new RegExp(`('${field}'\\s*:\\s*')[^']*(')`, "gi"),
            // Key=value format: apiKey=value (space or end delimiter)
            new RegExp(`(${field}\\s*[=:]\\s*)[^\\s,;\\]"}]+`, "gi"),
            // Authorization header: Bearer token
            new RegExp(`(bearer\\s+)[^\\s]+`, "gi"),
        ];

        for (const pattern of patterns) {
            sanitized = sanitized.replace(pattern, (match, prefix, suffix) => {
                // For patterns with 2 capture groups, suffix is the second group (e.g., closing quote)
                // For patterns with 1 capture group, suffix is the offset (a number)
                if (typeof suffix === "string") {
                    return `${prefix}[REDACTED]${suffix}`;
                }
                return `${prefix}[REDACTED]`;
            });
        }
    }

    return sanitized;
}

module.exports = {
    getSecurityConfig,
    isPrivateIP,
    loadSecurityConfig,
    resetSecurityConfig,
    sanitizeMessage,
    validateImageUrl,
    validateRedirectUrl,
};
