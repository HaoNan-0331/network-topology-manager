# CHANGELOG

## 2026-05-09

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
