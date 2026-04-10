# brainstorm: 对齐重构后前端与原版操作逻辑

## Goal

确保重构后的 Material Design 3 风格前端与原版前端的操作逻辑完全一致，实现"仅设计样式改变，原有功能全部不变"。

## What I already know

### 重构背景

- 已完成 UI 重构，从原版 UI 迁移到 Material Design 3 风格
- 移除了部分没有后端支持的功能（TrafficChart, RequestTable, 部分硬编码 MetricCards）
- 新增了多页面导航结构（Dashboard, Sessions, Settings）

### 原版结构（main 分支）

- 单页面应用，使用侧边栏标签切换
- 3 个标签：home（状态）, settings（设置）, logs（日志）
- 功能模块：
  - **Home 标签**：
    - Session Pool 管理（显示、重置健康状态）
    - 服务状态显示（serviceConnected）
    - 版本检查和显示（/api/version/check）
  - **Settings 标签**：
    - Settings 配置（流式模式、选择策略、错误阈值等）
  - **Logs 标签**：
    - 实时日志查看和下载

### 重构后结构（frontend-refactor 分支）

- 多页面应用，使用 SideNavBar 导航
- 3 个页面：
  - **StatusPage (Dashboard)** - 显示服务状态和会话信息
  - **SessionsPage** - 会话池管理
  - **SettingsPage** - 设置配置和日志

### 已发现的差异

#### ✅ 已对齐功能

1. Session Pool 管理（SessionsPage 实现）
   - 显示会话列表（ID、状态、使用次数、错误数、连接时间）✅
   - 重置会话健康状态 ✅
   - 服务状态显示 ✅
2. Settings 配置（SettingsPage 实现）✅
   - 所有设置项都已实现
3. 实时日志查看和下载（SettingsPage 实现）✅

#### ❌ 缺失功能

1. **版本检查功能**
   - 原版：调用 `/api/version/check`，显示当前版本和最新版本
   - 重构后：完全缺失此功能
   - 影响：用户无法知道是否有新版本可用

#### 🔄 变更行为

1. 导航方式改变：标签切换 → 页面路由
   - 原版：单页面内标签切换，无路由变化
   - 重构后：多页面路由导航
   - 影响：URL 变化，页面状态不保留
2. UI 布局改变
   - 原版：侧边栏图标 + 主内容区域
   - 重构后：SideNavBar + TopAppBar + 主内容区域

## Assumptions (temporary)

- 用户希望保留原有的所有功能，只是改变了视觉呈现方式
- 被移除的功能可能是误删或需要恢复
- 操作逻辑一致意味着：相同的 API 调用、相同的数据展示、相同的交互流程

## Open Questions

### Blocking Questions

1. ~~"原版网页"具体指的是 main 分支的旧 UI 吗？~~ ✅ 已确认：是的
2. ~~**版本检查功能缺失** - 需要恢复吗？~~ ✅ 已确认：需要恢复
   - 原版：调用 `/api/version/check` 显示当前版本和最新版本
   - 重构后：完全缺失
   - 用户影响：无法知道是否有新版本可用
   - **决策**：需要恢复此功能
3. ~~**导航方式变更** - 保持页面路由还是改回标签切换？~~ ✅ 已确认：改回单页面标签切换
   - 原版：单页面标签切换，无路由变化
   - 重构后：多页面路由导航，URL 变化
   - 用户影响：页面状态不保留，体验改变
   - **决策**：改回单页面标签切换，完全对齐原版体验

### Preference Questions

1. ~~已移除的功能（TrafficChart, RequestTable）确认不需要恢复？（commit message 说明没有后端支持）~~ ✅ 已确认：不需要恢复
   - TrafficChart 和 RequestTable 是重构过程中新增的，原版 main 分支没有
   - 原版根本就没有这些组件
2. ~~新增的 LoadDistribution 功能保留？（原版没有此功能）~~ ✅ 已确认：移除，对齐原版
   - LoadDistribution 是重构过程中新增的
   - 需要移除以对齐原版
3. ~~UI 组件结构如何处理？~~ ✅ 已确认：保持 Material Design 3
   - 保留 SideNavBar 和 TopAppBar 组件
   - 只修改内部逻辑（改标签切换、版本检查等）
   - 保持 Material Design 3 视觉风格

## Requirements (evolving)

- [x] 所有原版功能在重构版本中可用
- [ ] **版本检查功能恢复** - 调用 `/api/version/check`，显示当前版本和最新版本信息
- [ ] **导航方式改回单页面标签切换** - 保持 Material Design 3 组件，修改内部逻辑
  - 保留 SideNavBar 和 TopAppBar 组件
  - 3个标签：dashboard (状态+会话) / settings (设置) / logs (日志)
  - 移除路由跳转，使用 v-if/v-show 切换内容
  - URL 保持不变
- [ ] **合并页面内容对齐原版标签结构**
  - dashboard 标签：状态展示 + 会话池管理（合并 StatusPage + SessionsPage）
  - settings 标签：设置配置（仅保留设置部分）
  - logs 标签：实时日志（从 SettingsPage 拆分）
  - 最终：单个 StatusPage.vue 文件，包含3个标签的所有内容
- [ ] **保留页面状态** - 切换标签时保留各标签的状态
  - settings 标签：保留用户输入的内容（如阈值设置）
  - logs 标签：保留日志内容和滚动位置
  - dashboard 标签：保留会话列表状态
- [ ] **移除重构过程中新增的功能** - 对齐原版
  - 移除 LoadDistribution 组件（原版没有）
  - 不恢复 TrafficChart/RequestTable（原版也没有）
  - 删除独立的 SessionsPage.vue 和 SettingsPage.vue
- [ ] API 调用逻辑与原版一致
- [ ] 数据展示逻辑与原版一致
- [ ] 用户交互流程与原版一致

## Acceptance Criteria (evolving)

- [ ] **版本检查功能**
  - [ ] 调用 `/api/version/check` API
  - [ ] 显示当前版本和最新版本
  - [ ] 新版本提示功能
  - [ ] API 失败时静默处理
- [ ] **单页面标签切换**
  - [ ] 3个标签可正常切换
  - [ ] URL 不随标签切换变化
  - [ ] 各标签状态保留
- [ ] **标签内容对齐**
  - [ ] dashboard 标签包含：状态展示 + 会话池管理
  - [ ] settings 标签包含：所有设置配置项
  - [ ] logs 标签包含：实时日志查看和下载
- [ ] **功能完整性**
  - [ ] 会话池管理（显示、重置健康状态）正常工作
  - [ ] 所有设置项可正常更新
  - [ ] 日志实时更新和下载功能正常
- [ ] **移除新功能**
  - [ ] LoadDistribution 组件已移除
  - [ ] SessionsPage.vue 和 SettingsPage.vue 已删除或合并
- [ ] 所有 API 调用与原版一致
- [ ] 用户体验测试确认操作逻辑一致

## Definition of Done (team quality bar)

- 代码遵循 `.trellis/spec/frontend/` 指南
- 所有 lint 检查通过
- 手动功能测试通过
- 文档更新（如有必要）

## Out of Scope (explicit)

- 新增原版不存在的功能
- 后端 API 修改
- 移动端响应式设计优化

## Technical Approach

### 核心变更策略

**1. 单页面标签切换架构**

- 保留 SideNavBar 和 TopAppBar 组件（Material Design 3 风格）
- 移除 Vue Router 路由跳转
- 使用 activeTab state + v-if/v-show 切换内容
- 合并 SessionsPage 和 SettingsPage 内容到 StatusPage.vue

**2. 标签结构对齐**

```
原版 main 分支:
  - home: 状态展示 + 会话池管理
  - settings: 设置配置
  - logs: 实时日志

重构后:
  - dashboard: 状态展示 + 会话池管理
  - settings: 设置配置
  - logs: 实时日志
```

**3. 版本检查功能恢复**

- 在 dashboard 标签顶部添加版本信息展示
- 调用 `/api/version/check` API
- 显示当前版本和最新版本
- 新版本可用时显示提示

**4. 页面状态保留**

- 使用 v-show 替代 v-if 保留 DOM 状态
- 或使用 keep-alive 组件缓存状态

**5. 组件清理**

- 移除 LoadDistribution.vue
- 删除 SessionsPage.vue 和 SettingsPage.vue
- 清理 Router 配置

### 实施路径

**Phase 1: 架构调整**

- 修改 SideNavBar 逻辑：移除 router.push，改用 emit 事件
- 在 StatusPage 中实现标签切换逻辑
- 合并 SessionsPage 和 SettingsPage 内容

**Phase 2: 功能恢复**

- 添加版本检查功能
- 确保所有设置项工作正常
- 确保日志功能工作正常

**Phase 3: 清理和测试**

- 移除 LoadDistribution
- 删除独立页面文件
- 清理路由配置
- 全量功能测试

## Decision (ADR-lite)

**Context**: 重构后的前端采用了多页面路由架构，与原版单页面标签切换不一致，且缺失版本检查功能

**Decision**:

1. 改回单页面标签切换架构，保持 Material Design 3 视觉风格
2. 完全对齐原版标签结构：dashboard(状态+会话) / settings(设置) / logs(日志)
3. 恢复版本检查功能
4. 移除重构过程中新增的 LoadDistribution 组件

**Consequences**:

- 用户体验与原版完全一致
- Material Design 3 视觉风格保留
- 代码量减少（删除独立页面和路由）
- 维护成本降低（单文件架构）

## Technical Notes

### 原版代码位置

- `.temp/main-frontend/ui/app/pages/StatusPage.vue`（备份）
- 或通过 `git show main:ui/app/pages/StatusPage.vue` 查看

### 重构后代码位置

- `ui/app/pages/StatusPage.vue`
- `ui/app/pages/SessionsPage.vue`
- `ui/app/pages/SettingsPage.vue`

### 相关任务

- ui-redesign-dashboard（已归档）
- dashboard-backend-integration（已归档）
- sessions-page-implementation（已归档）
- settings-page-implementation（已归档）

### 重构提交

- `0a8b321` - refactor(ui): remove features without backend support and fix Ralph Loop
