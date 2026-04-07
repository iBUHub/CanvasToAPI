/**
 * File: src/utils/ProxyUtils.js
 * Description: Utility functions for parsing proxy configuration from environment variables
 *
 * Author: iBUHUB
 */

const PROXY_SERVER_ENV_KEYS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"];
const NO_PROXY_ENV_KEYS = ["NO_PROXY", "no_proxy"];
const DEFAULT_BYPASS = ["localhost", "127.0.0.1", "::", "::1", "0.0.0.0"];

const _getFirstEnvValue = envKeys => {
    const envKey = envKeys.find(key => process.env[key] && String(process.env[key]).trim());
    return envKey
        ? {
              envKey,
              value: String(process.env[envKey]).trim(),
          }
        : null;
};

const _getProxyServerEnv = () => _getFirstEnvValue(PROXY_SERVER_ENV_KEYS);

const _getBypassEntries = () => {
    const bypassEnv = _getFirstEnvValue(NO_PROXY_ENV_KEYS);
    const userBypass = bypassEnv
        ? bypassEnv.value
              .split(",")
              .map(s => s.trim())
              .filter(Boolean)
        : [];

    return [...new Set([...DEFAULT_BYPASS, ...userBypass])];
};

const _buildBypassString = () => _getBypassEntries().join(",");

// Redact credentials in proxy strings, without needing valid URL parsing.
// - `scheme://user:pass@host` -> `scheme://***@host`
// - `user:pass@host:port` -> `***@host:port`
const _redactProxyCredentials = serverRaw => {
    const raw = String(serverRaw);
    const withScheme = raw.replace(/^([a-z][a-z0-9+.-]*:\/\/)([^@/]+)@/i, "$1***@");
    if (withScheme !== raw) return withScheme;
    return raw.replace(/^([^@/]+)@/, "***@");
};

/**
 * Parse proxy configuration from environment variables
 * Supports HTTPS_PROXY, HTTP_PROXY, ALL_PROXY and their lowercase variants
 * Also supports NO_PROXY for bypass rules
 *
 * @returns {Object|null} Proxy config object for Playwright, or null if no proxy configured
 * @example
 * // Returns: { server: "http://127.0.0.1:7890", bypass: "localhost,127.0.0.1" }
 * // Or with auth: { server: "http://proxy.com:8080", username: "user", password: "pass" }
 */
const parseProxyFromEnv = () => {
    const proxyEnv = _getProxyServerEnv();
    if (!proxyEnv) return null;

    const bypass = _buildBypassString();

    // Playwright expects: { server, bypass?, username?, password? }
    // server examples: "http://127.0.0.1:7890", "socks5://127.0.0.1:7890"
    try {
        const u = new URL(proxyEnv.value);
        const proxy = {
            bypass,
            server: `${u.protocol}//${u.host}`,
        };

        if (u.username) proxy.username = decodeURIComponent(u.username);
        if (u.password) proxy.password = decodeURIComponent(u.password);

        return proxy;
    } catch {
        // If URL parsing fails, use raw value directly
        return {
            bypass,
            server: proxyEnv.value,
        };
    }
};

/**
 * Get a safe summary of proxy configuration from environment variables.
 * This is intended for logging/UI display and avoids leaking credentials.
 *
 * @returns {{enabled: boolean, envKey?: string, server?: string}}
 */
const getProxySummaryFromEnv = () => {
    const proxyEnv = _getProxyServerEnv();
    if (!proxyEnv) return { enabled: false };

    const serverRaw = proxyEnv.value;

    try {
        const u = new URL(serverRaw);
        return {
            enabled: true,
            envKey: proxyEnv.envKey,
            server: `${u.protocol}//${u.host}`,
        };
    } catch {
        // If URL parsing fails, at least redact obvious `user:pass@` patterns
        return {
            enabled: true,
            envKey: proxyEnv.envKey,
            server: _redactProxyCredentials(serverRaw),
        };
    }
};

module.exports = { getProxySummaryFromEnv, parseProxyFromEnv };
