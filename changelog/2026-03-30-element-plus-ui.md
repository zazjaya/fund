# v2.1.0 (2026-03-30)

## UI 升级

- 集成 Element Plus UI 库，现代化设计风格
- 全新 Header 导航栏，集成更新时间显示
- 全新 Toolbar 工具栏，使用 el-input、el-select、el-button、el-radio-group
- FundTable 桌面端使用 el-table 表格，移动端自动切换为卡片布局
- FundManageModal 使用 el-dialog 对话框
- 统一主题色 #4f46e5

## 响应式优化

- PC 端 (>1024px): 完整表格 9 列
- 平板端 (768-1024px): 紧凑表格
- 移动端 (<768px): 卡片式布局
- 管理基金弹窗适配移动端
- 移动端卡片添加涨跌幅排序按钮（升序/降序）

## 功能修复

- 修复"看全部"不刷新数据的问题
- 修复"看全部"时清空密钥输入框的问题，现在保留密钥
- 修复"上一交易日涨跌"不显示基金名称的问题（从 pingzhongdata 接口获取名称）
- 优化表格字体加粗显示
- 建议和原因列支持多行显示（持仓/空仓格式）
- 更新时间格式改为 "更新时间：YYYY-MM-DD HH:mm"
- 修复移动端卡片建议原因换行显示
- 修复移动端卡片名称显示顺序（名称在上加粗，代码在下）
- 修复表格列排序不生效问题（添加 prop 属性）

## 技术变更

- 新增依赖：element-plus、@element-plus/icons-vue
- src/main.js 引入 Element Plus
- src/assets/style.css 适配 Element Plus 样式
- fetchPingzhongdata 现在返回 { trend, name }
- getLastTradingChange 返回 { change, date, name }

## 涉及文件

- `src/main.js` - 引入 Element Plus
- `src/components/Header.vue` - 使用 el-menu 导航栏
- `src/components/IndexStrip.vue` - 优化响应式
- `src/components/Toolbar.vue` - 使用 Element Plus 组件
- `src/components/FundTable.vue` - 桌面端表格/移动端卡片/排序功能
- `src/components/FundManageModal.vue` - 使用 el-dialog
- `src/components/CustomAlert.vue` - 移动端适配
- `src/App.vue` - 容器样式、showAll 状态管理
- `src/assets/style.css` - Element Plus 主题适配
- `src/api/funds.js` - fetchPingzhongdata 返回名称
- `src/composables/useAdvice.js` - 适配 fetchPingzhongdata 返回值变化