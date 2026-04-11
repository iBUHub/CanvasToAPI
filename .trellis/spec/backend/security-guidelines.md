# Security Guidelines

> Security patterns and best practices for protecting against common vulnerabilities.

---

## Overview

This project implements security measures against common web vulnerabilities. All security features use a **configuration-first** approach with **backward-compatible defaults**.

**Key Principles:**

- Security features default to OFF/permissive (except safe features like log sanitization)
- Configuration via `configs/security.json` with environment variable overrides
- Never crash the service due to security validation failures
- Log security violations at WARN level for monitoring

---

## Security Configuration

### Configuration File

Security settings are defined in `configs/security.json`:

**File:** `configs/security.json`

```json
{
  "logFilter": {
    "enabled": true,
    "sensitiveFields": ["authorization", "cookie", "credential", "password", "secret", "session", "token"]
  },
  "openRedirect": {
    "allowedRedirectDomains": [],
    "enabled": false
  },
  "ssrf": {
    "allowPrivateIPs": true,
    "allowedDomains": [],
    "allowedProtocols": ["https"],
    "blockedDomains": [],
    "enabled": false
  }
}
```

### Environment Variable Overrides

Environment variables take precedence over config file settings:

| Environment Variable     | Config Path            | Description                     |
| ------------------------ | ---------------------- | ------------------------------- |
| `SSRF_ENABLED`           | `ssrf.enabled`         | Enable SSRF protection          |
| `SSRF_ALLOW_PRIVATE_IPS` | `ssrf.allowPrivateIPs` | Allow private IP addresses      |
| `OPEN_REDIRECT_ENABLED`  | `openRedirect.enabled` | Enable open redirect protection |
| `LOG_FILTER_ENABLED`     | `logFilter.enabled`    | Enable log sanitization         |

---

## SSRF Protection

### Scenario: Image URL Fetch

### 1. Scope / Trigger

- **Trigger**: User-provided URLs are fetched by the server (e.g., image URLs in API requests)
- **Risk**: Access to internal resources, cloud metadata endpoints, or other restricted resources

### 2. Signatures

```javascript
/**
 * Validate an image URL for SSRF protection
 * @param {string} url - The URL to validate
 * @returns {Promise<{valid: boolean, reason?: string, resolvedIp?: string}>}
 */
async validateImageUrl(url)
```

### 3. Contracts

**Request:**

| Field | Type   | Constraints                  |
| ----- | ------ | ---------------------------- |
| `url` | string | Must be valid HTTP/HTTPS URL |

**Response:**

| Field        | Type    | Description                       |
| ------------ | ------- | --------------------------------- |
| `valid`      | boolean | Whether URL is safe to fetch      |
| `reason`     | string? | Reason for rejection (if invalid) |
| `resolvedIp` | string? | Resolved IP address (for logging) |

### 4. Validation & Error Matrix

| Condition                                                 | Result           | Reason                             |
| --------------------------------------------------------- | ---------------- | ---------------------------------- |
| Invalid URL format                                        | `{valid: false}` | "Invalid URL format"               |
| Protocol not in allowedProtocols                          | `{valid: false}` | "Protocol not allowed: <protocol>" |
| Domain in blockedDomains                                  | `{valid: false}` | "Domain is blocked"                |
| Domain not in allowedDomains (when whitelist set)         | `{valid: false}` | "Domain not in whitelist"          |
| IP resolves to private range (when allowPrivateIPs=false) | `{valid: false}` | "Private IP address not allowed"   |
| DNS resolution fails                                      | `{valid: false}` | "Failed to resolve hostname"       |
| All checks pass                                           | `{valid: true}`  | -                                  |

### 5. Good/Base/Bad Cases

**Good Case - Allowed URL:**

```javascript
const result = await SecurityValidator.validateImageUrl("https://example.com/image.png");
// { valid: true, resolvedIp: "93.184.216.34" }
```

**Base Case - Protection Disabled:**

```javascript
// SSRF_ENABLED=false (default)
const result = await SecurityValidator.validateImageUrl("https://internal.corp/image.png");
// { valid: true } - All URLs allowed
```

**Bad Case - Blocked Private IP:**

```javascript
// SSRF_ENABLED=true, SSRF_ALLOW_PRIVATE_IPS=false
const result = await SecurityValidator.validateImageUrl("https://internal.corp/image.png");
// { valid: false, reason: "Private IP address not allowed: 10.0.0.5" }
```

### 6. Tests Required

**Unit Tests:**

- [ ] Valid public URL passes validation
- [ ] Invalid URL format is rejected
- [ ] Non-HTTPS protocol is rejected (when configured)
- [ ] Private IPv4 addresses are detected correctly
- [ ] Private IPv6 addresses are detected correctly
- [ ] Cloud metadata IP (169.254.169.254) is detected
- [ ] Domain whitelist works correctly
- [ ] Domain blacklist works correctly
- [ ] DNS rebinding protection (resolve twice, compare IPs)

### 7. Wrong vs Correct

#### Wrong

```javascript
// Fetching user-provided URL without validation
const response = await axios.get(userProvidedUrl, { responseType: "arraybuffer" });
```

#### Correct

```javascript
// Validate URL before fetching
const validation = await SecurityValidator.validateImageUrl(userProvidedUrl);
if (!validation.valid) {
  this.logger.warn(`[Security] Blocked image URL: ${validation.reason}`);
  return { error: `Image URL blocked: ${validation.reason}` };
}
const response = await axios.get(userProvidedUrl, { responseType: "arraybuffer" });
```

---

## Private IP Detection

### Supported Private IP Ranges

The `isPrivateIP()` function detects these ranges:

**IPv4:**

| CIDR             | Description                          |
| ---------------- | ------------------------------------ |
| `10.0.0.0/8`     | Private network                      |
| `172.16.0.0/12`  | Private network                      |
| `192.168.0.0/16` | Private network                      |
| `127.0.0.0/8`    | Loopback                             |
| `169.254.0.0/16` | Link-local (includes cloud metadata) |
| `0.0.0.0/8`      | Current network                      |

**IPv6:**

| CIDR        | Description          |
| ----------- | -------------------- |
| `::1/128`   | Loopback             |
| `fc00::/7`  | Unique local address |
| `fe80::/10` | Link-local           |

### Implementation

**File:** `src/utils/SecurityValidator.js`

```javascript
/**
 * Check if an IP address is private/internal
 * @param {string} ip - IPv4 or IPv6 address
 * @returns {boolean} True if private/internal
 */
isPrivateIP(ip) {
    // IPv4 private ranges
    const ipv4PrivateRanges = [
        { start: "0.0.0.0", end: "0.255.255.255" },
        { start: "10.0.0.0", end: "10.255.255.255" },
        { start: "127.0.0.0", end: "127.255.255.255" },
        { start: "169.254.0.0", end: "169.254.255.255" },
        { start: "172.16.0.0", end: "172.31.255.255" },
        { start: "192.168.0.0", end: "192.168.255.255" },
    ];

    // IPv6 private ranges
    const ipv6PrivateRanges = [
        "::1",           // Loopback
        "fc00::/7",      // Unique local
        "fe80::/10",     // Link-local
    ];

    // ... implementation details
}
```

---

## Open Redirect Protection

### Scenario: External Redirect URL

### 1. Scope / Trigger

- **Trigger**: Application redirects to user-configurable URL
- **Risk**: Phishing attacks, URL manipulation

### 2. Signatures

```javascript
/**
 * Validate a redirect URL
 * @param {string} url - The URL to validate
 * @returns {{valid: boolean, reason?: string}}
 */
validateRedirectUrl(url);
```

### 3. Contracts

**Request:**

| Field | Type   | Constraints          |
| ----- | ------ | -------------------- |
| `url` | string | URL or relative path |

**Response:**

| Field    | Type    | Description                        |
| -------- | ------- | ---------------------------------- |
| `valid`  | boolean | Whether URL is safe to redirect to |
| `reason` | string? | Reason for rejection (if invalid)  |

### 4. Validation & Error Matrix

| Condition                      | Result           | Reason                    |
| ------------------------------ | ---------------- | ------------------------- |
| Relative URL (starts with `/`) | `{valid: true}`  | Always allowed            |
| Protection disabled            | `{valid: true}`  | All URLs allowed          |
| Absolute URL in whitelist      | `{valid: true}`  | -                         |
| Absolute URL not in whitelist  | `{valid: false}` | "Domain not in whitelist" |

### 5. Good/Base/Bad Cases

**Good Case - Relative Path:**

```javascript
const result = SecurityValidator.validateRedirectUrl("/AIStudio_logo.svg");
// { valid: true }
```

**Base Case - Protection Disabled:**

```javascript
// OPEN_REDIRECT_ENABLED=false (default)
const result = SecurityValidator.validateRedirectUrl("https://evil.com/phishing");
// { valid: true } - All URLs allowed
```

**Bad Case - Blocked External URL:**

```javascript
// OPEN_REDIRECT_ENABLED=true, allowedDomains=["cdn.example.com"]
const result = SecurityValidator.validateRedirectUrl("https://evil.com/phishing");
// { valid: false, reason: "Domain not in whitelist: evil.com" }
```

### 6. Tests Required

- [ ] Relative URLs always pass validation
- [ ] Absolute URLs pass when in whitelist
- [ ] Absolute URLs fail when not in whitelist
- [ ] Protection disabled allows all URLs

### 7. Wrong vs Correct

#### Wrong

```javascript
// Redirecting to user-configured URL without validation
app.get("/favicon.ico", (req, res) => {
  const iconUrl = process.env.ICON_URL || "/AIStudio_logo.svg";
  res.redirect(302, iconUrl);
});
```

#### Correct

```javascript
// Validate redirect URL before redirecting
app.get("/favicon.ico", (req, res) => {
  const iconUrl = process.env.ICON_URL || "/AIStudio_logo.svg";
  const validation = SecurityValidator.validateRedirectUrl(iconUrl);
  if (!validation.valid) {
    this.logger.warn(`[Security] Blocked redirect to: ${iconUrl}`);
    return res.redirect(302, "/AIStudio_logo.svg");
  }
  res.redirect(302, iconUrl);
});
```

---

## Sensitive Data Log Filtering

### Pattern: Automatic Sanitization

All log messages are automatically sanitized to prevent sensitive data leakage.

**Default Sensitive Fields:**

- `password`
- `token`
- `apiKey` / `api_key`
- `authorization`
- `cookie`
- `session`
- `secret`
- `credential`

### Implementation

**File:** `src/utils/LoggingService.js`

```javascript
const SecurityValidator = require("./SecurityValidator");

class LoggingService {
  _formatMessage(level, message) {
    const timestamp = this._getTimestamp();
    // Sanitize message before logging
    const sanitizedMessage = SecurityValidator.sanitizeMessage(message);
    const formatted = `[${level}] ${timestamp} [${this.serviceName}] - ${sanitizedMessage}`;
    // ...
  }
}
```

**File:** `src/utils/SecurityValidator.js`

```javascript
/**
 * Sanitize a message by redacting sensitive field values
 * @param {string} message - The message to sanitize
 * @returns {string} Sanitized message
 */
sanitizeMessage(message) {
    const config = loadSecurityConfig();
    if (!config.logFilter?.enabled) return String(message);

    const fields = config.logFilter.sensitiveFields || [];
    let sanitized = String(message);

    for (const field of fields) {
        // Pattern 1: key="value" or key='value'
        // Pattern 2: key: "value" or key: 'value'
        const patterns = [
            new RegExp(`(${field}["']?\\s*[:=]\\s*["']?)([^"'\\s,}]+)`, "gi"),
        ];
        for (const pattern of patterns) {
            sanitized = sanitized.replace(pattern, "$1[REDACTED]");
        }
    }
    return sanitized;
}
```

### Example

**Before sanitization:**

```
[INFO] User login with password="secret123" and apiKey: "sk-abc123"
```

**After sanitization:**

```
[INFO] User login with password="[REDACTED]" and apiKey: "[REDACTED]"
```

---

## Common Mistakes

### Mistake 1: Fetching User URLs Without Validation

**Wrong:**

```javascript
const response = await axios.get(userProvidedImageUrl);
```

**Correct:**

```javascript
const validation = await SecurityValidator.validateImageUrl(userProvidedImageUrl);
if (!validation.valid) {
  this.logger.warn(`[Security] Blocked URL: ${validation.reason}`);
  return { error: validation.reason };
}
const response = await axios.get(userProvidedImageUrl);
```

### Mistake 2: Redirecting to External URLs Without Validation

**Wrong:**

```javascript
res.redirect(302, process.env.CUSTOM_URL);
```

**Correct:**

```javascript
const url = process.env.CUSTOM_URL || "/default";
const validation = SecurityValidator.validateRedirectUrl(url);
if (!validation.valid) {
  return res.redirect(302, "/default");
}
res.redirect(302, url);
```

### Mistake 3: Logging Sensitive Data

**Wrong:**

```javascript
this.logger.info(`User logged in with password: ${password}`);
```

**Correct:**

```javascript
// Log sanitization is automatic, but best practice:
this.logger.info(`User logged in successfully`);
```

### Mistake 4: Breaking Backward Compatibility

**Wrong:**

```javascript
// Enabling security by default
"ssrf": { "enabled": true }
```

**Correct:**

```javascript
// Security off by default, users opt-in
"ssrf": { "enabled": false }
```

---

## Security Checklist

When adding features that handle external URLs or redirects:

- [ ] Use `SecurityValidator.validateImageUrl()` before fetching user-provided URLs
- [ ] Use `SecurityValidator.validateRedirectUrl()` before redirecting to external URLs
- [ ] Log security violations at WARN level
- [ ] Provide graceful fallback behavior
- [ ] Never crash the service due to security validation
- [ ] Test with `SSRF_ENABLED=true` and `SSRF_ALLOW_PRIVATE_IPS=false`
- [ ] Document environment variable overrides in README
