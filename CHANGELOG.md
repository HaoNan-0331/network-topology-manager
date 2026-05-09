# CHANGELOG

## 2026-05-09

### Task 5: 认证服务
- 新增 `electron/services/auth.ts`：验证码生成/验证、登录、首次运行检测、管理员初始化
- 修改 `electron/main.ts`：集成数据库初始化、密钥管理器、认证 IPC 处理器
- 新增 `tests/unit/auth.test.ts`：验证码相关单元测试（4 cases 全部通过）
