# Fix All Security Vulnerabilities

**Task Type**: Backend Security Fix
**Priority**: P0 (Critical)
**Dev Type**: backend

---

## Goal

修复 P0+P1 安全审查发现的所有 9 个漏洞，确保代码遵循安全编码最佳实践，不引入新的安全问题。

---

## Background

项目已完成两个阶段的安全审查：

- **P0 (基础审查)**: 发现 8 个漏洞
- **P1 (深化审查)**: 新增发现 1 个漏洞

**总计**: 9 个漏洞（1 高危、6 中危、2 低危）

完整审查报告位于：`.trellis/tasks/04-11-backend-security-audit/security-audit-report-complete.md`

---

## Decision (ADR-lite)

### Configuration Strategy

**Context**: Security features need configuration flexibility while maintaining backward compatibility.

**Decision**: Use `configs/security.json` + Environment Variables (Option 2)

**Consequences**:

- ✅ Out-of-the-box default config that doesn't break existing functionality
- ✅ Security features default to OFF/permissive, users opt-in for stricter security
- ✅ Config file with clear comments and examples
- ⚠️ One additional config file to manage

### Default Security Configuration (Backward Compatible)

| Setting                            | Default | Purpose                            |
| ---------------------------------- | ------- | ---------------------------------- |
| `SSRF_PROTECTION_ENABLED`          | `false` | SSRF protection off by default     |
| `SSRF_ALLOW_PRIVATE_IPS`           | `true`  | Allow private IPs (intranet use)   |
| `SSRF_ALLOWED_DOMAINS`             | `[]`    | Empty = allow all domains          |
| `OPEN_REDIRECT_PROTECTION_ENABLED` | `false` | Open redirect protection off       |
| `SENSITIVE_LOG_FILTER_ENABLED`     | `true`  | Log filtering ON by default (safe) |

---

## Requirements

### 🔴 HIGH Priority

#### 1. SSRF (Server-Side Request Forgery) - FormatConverter.js

**Location**: `src/core/FormatConverter.js:644, 2154, 2943`

**Issue**: 应用从用户提供的 URL 获取图片时未进行验证，`axios.get()` 接受任意 URL。

**Fix Requirements**:

- [ ] 创建 `configs/security.json` 配置文件
- [ ] 实现 `SecurityConfig` 工具类加载配置
- [ ] 实现 `validateImageUrl()` 函数：
  - [ ] URL 格式验证
  - [ ] 协议限制（仅 HTTPS，可选 HTTP for trusted domains）
  - [ ] 私有 IP 范围检测（可配置是否阻止）
  - [ ] DNS rebinding 防护（解析后再次验证 IP）
  - [ ] 域名白名单验证
- [ ] 在 3 处 `axios.get()` 调用前添加验证
- [ ] 添加详细的错误日志

**Acceptance Criteria**:

- 配置默认关闭，不影响现有功能
- 开启后，恶意 URL（内网地址、云元数据地址）被拒绝
- 白名单机制可配置
- 所有功能测试通过

---

### 🟡 MEDIUM Priority

#### 2. Open Redirect - StatusRoutes.js

**Location**: `src/routes/StatusRoutes.js:19-25`

**Issue**: `/favicon.ico` 端点使用未验证的 `ICON_URL` 环境变量进行重定向。

**Fix Requirements**:

- [ ] 在 `configs/security.json` 添加重定向白名单配置
- [ ] 实现 `validateRedirectUrl()` 函数：
  - [ ] 相对路径始终允许
  - [ ] 绝对 URL 需在白名单中
- [ ] 默认**关闭**验证（向后兼容）
- [ ] 记录被拒绝的重定向尝试

**Acceptance Criteria**:

- 配置默认关闭，现有功能不受影响
- 开启后，恶意重定向被阻止
- 相对路径始终正常工作

#### 3. Sensitive Data Logging - LoggingService.js

**Location**: `src/utils/LoggingService.js`

**Issue**: 可能记录敏感信息（API keys、session data、user credentials）。

**Fix Requirements**:

- [ ] 在 `configs/security.json` 添加敏感字段配置
- [ ] 实现 `_sanitizeMessage()` 方法过滤敏感信息
- [ ] 默认敏感字段：password, token, apiKey, api_key, authorization, cookie, session, secret
- [ ] 支持自定义敏感字段列表
- [ ] **默认启用**（不影响功能，提升安全性）

**Acceptance Criteria**:

- 敏感信息不会出现在日志中
- 过滤机制可通过配置关闭
- 日志仍包含足够的调试信息

#### 4. Session Fixation Risk - AuthRoutes.js ✅ ALREADY MITIGATED

**Location**: `src/routes/AuthRoutes.js:176`

**Status**: 已实现防护！

代码审查发现：

- Line 176: `req.session.regenerate()` 已在登录成功后重新生成会话
- Rate limiting 已实现
- 客户端 IP 检测已处理 CDN 场景

**Remaining Work**:

- [ ] 验证 session secret 配置是否安全
- [ ] 添加会话超时配置建议

#### 5-7. 其他中危漏洞

详见完整审查报告，需要类似处理：

- 输入验证增强
- 错误处理改进
- 权限检查完善

---

### 🟢 LOW Priority

#### 8-9. 低危漏洞

- 输入验证不足：添加更严格的验证规则
- 错误处理不当：改进错误消息，避免泄露敏感信息

---

## Technical Notes

### 安全编码原则

1. **输入验证**: 永远不信任用户输入
2. **最小权限**: 只授予必要的权限
3. **深度防御**: 多层安全措施
4. **安全默认**: 默认配置应是最安全的
5. **日志与监控**: 记录安全相关事件

### 涉及文件

主要文件（优先级高）：

- `src/core/FormatConverter.js` - SSRF 修复
- `src/routes/StatusRoutes.js` - 开放重定向修复
- `src/utils/LoggingService.js` - 敏感数据日志修复
- `src/routes/AuthRoutes.js` - 会话固定修复

次要文件：

- `src/core/SessionRegistry.js`
- `src/utils/ShareLink.js`
- `src/utils/MessageQueue.js`
- `src/routes/WebRoutes.js`

### 测试要求

- [ ] 所有现有测试通过
- [ ] 添加针对安全修复的单元测试
- [ ] 验证修复后的功能正常工作
- [ ] 运行 npm run lint 无错误

---

## Implementation Guidelines

1. **遵循项目规范**: 参考 `.trellis/spec/backend/` 下的所有规范文档
2. **使用 GitNexus**: 在修改任何函数前运行 `gitnexus_impact()` 评估影响
3. **代码质量**: 运行 `npm run lint` 和 `npm run lint:fix`
4. **测试**: 确保修复不破坏现有功能

---

## Definition of Done

- [ ] 所有 9 个漏洞已修复
- [ ] 修复代码通过 lint 检查
- [ ] 功能测试通过
- [ ] 无新的安全问题引入
- [ ] 代码已提交到 `fix/security-vulnerabilities` 分支
- [ ] 准备创建 PR
