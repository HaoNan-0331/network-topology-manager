# CHANGELOG

## 2026-05-09

### Task 13: 系统设置页面（AI配置+白名单编辑器+执行模式切换+日志查看器+退出登录）
- 新增 `src/components/settings/CommandWhitelistEditor.tsx`：命令白名单编辑器（标签列表+添加/删除+保存）
- 新增 `src/components/settings/AIExecLogViewer.tsx`：AI 执行日志表格查看器（分页、状态彩色标签、刷新）
- 新增 `src/components/settings/ExecModeSwitch.tsx`：执行模式切换（确认/自动，切换自动需密码验证弹窗）
- 替换 `src/components/pages/SettingsPage.tsx`：完整设置页（AI模型配置表单、白名单、执行模式、日志查看、退出登录）

### Task 12: AI 服务（配置+对话+设备查询+命令安全+日志）
- 新增 `electron/services/commandSafety.ts`：命令白名单安全检查（白名单前缀匹配+黑名单正则双重防护）
- 新增 `electron/services/aiExecLogger.ts`：AI 执行日志记录（创建/更新状态/查询，设备名加密存储）
- 新增 `electron/services/ai.ts`：AI 服务核心（配置管理、OpenAI兼容API调用、设备SSH命令执行、确认/自动模式、聊天历史持久化）
- 修改 `electron/main.ts`：注册 AI IPC 处理器（chat/getConfig/saveConfig/whitelist/execMode/confirm/logs/history）
- 替换 `src/components/pages/AIPage.tsx`：完整AI聊天界面（设备选择、消息气泡、确认弹窗、未配置提示）

### Task 11: 设备连接（独立弹窗终端+SSH Key）
- 新增 `electron/services/connection.ts`：连接服务（SSH/Telnet连接管理、终端窗口创建、SSH Key认证优先）
- 新增 `electron/terminal-preload.ts`：终端弹窗预加载脚本（terminalApi 桥接）
- 新增 `terminal.html`：终端弹窗 HTML 入口
- 新增 `src/terminal-main.tsx`：终端窗口独立 React 入口
- 新增 `src/components/TerminalWindow.tsx`：xterm.js 终端组件
- 修改 `electron/main.ts`：注册连接 IPC 处理器和终端窗口 IPC
- 修改 `src/types/topology.ts`：TopologyNodeData 增加 connectionType 字段
- 修改 `src/types/electron.d.ts`：增加 TerminalAPI 类型声明
- 修改 `src/components/topology/TopologyCanvas.tsx`：增加 onNodeDoubleClick 属性
- 修改 `src/components/topology/AddDeviceModal.tsx`：节点数据包含 connectionType
- 修改 `src/components/pages/TopologyPage.tsx`：双击设备节点触发连接（SSH/Telnet/Web）

### Task 10: 拓扑管理页面（含导入导出）
- 新增 `electron/services/topology.ts`：拓扑 CRUD 服务（名称/数据加密，导入导出）
- 新增 `src/components/topology/TopologyToolbar.tsx`：工具栏（选择拓扑/新建/保存/删除/导入/导出）
- 新增 `src/components/topology/AddDeviceModal.tsx`：设备选择弹窗（从设备列表添加到画布）
- 替换 `src/components/pages/TopologyPage.tsx`：完整拓扑管理（IPC CRUD、自动保存、导入导出）
- 修改 `electron/main.ts`：注册拓扑 IPC 处理器，共享 masterKey

### Task 9: React Flow 拓扑画布
- 新增 `src/types/topology.ts`：TopologyNodeData/TopologyEdgeData/Topology 类型定义
- 新增 `src/components/topology/DeviceNode.tsx`：自定义设备节点（router/switch/firewall/server/generic 图标，设备名悬浮在图标上方）
- 新增 `src/components/topology/EdgeWithInterfaces.tsx`：自定义连线，靠近源/目标节点显示接口标签
- 新增 `src/components/topology/ConnectionModal.tsx`：Ant Design 弹窗，连接时输入源/目标接口名称
- 新增 `src/components/topology/TopologyCanvas.tsx`：React Flow 画布主组件（Controls/MiniMap/Background）
- 替换 `src/components/pages/TopologyPage.tsx`：拓扑管理页面（本地状态管理，Task 10 接入 IPC）
- 新增 `src/vite-env.d.ts`：CSS 模块声明
- 修改 `src/main.tsx`：全局引入 reactflow/dist/style.css

### Task 8: 设备管理 CRUD
- 新增 `src/types/device.ts`：Device/CreateDeviceDTO/UpdateDeviceDTO 类型定义
- 新增 `electron/services/device.ts`：设备 CRUD 服务（全字段加密、级联删除拓扑节点）
- 新增 `src/components/DeviceForm.tsx`：设备表单（设备类型选择、连接方式联动、SSH Key 支持）
- 替换 `src/components/pages/DevicesPage.tsx`：设备管理页面（列表/添加/编辑/删除）
- 修改 `electron/main.ts`：引入 device 服务、masterKey 共享、注册设备 IPC 处理器

### Task 5: 认证服务
- 新增 `electron/services/auth.ts`：验证码生成/验证、登录、首次运行检测、管理员初始化
- 修改 `electron/main.ts`：集成数据库初始化、密钥管理器、认证 IPC 处理器
- 新增 `tests/unit/auth.test.ts`：验证码相关单元测试（4 cases 全部通过）
