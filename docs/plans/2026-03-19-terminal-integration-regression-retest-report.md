# 2026-03-19 终端功能联调回归与缺陷分级复验报告

## 执行范围

- 入口显示
- 底部窗口打开/收起
- 页签切换
- 右上角新增不同 shell
- 多实例并行可用性
- 高风险路径优先：快速连点新增终端、频繁切换页签、收起后再次展开

## 执行方式与证据

1. 自动化回归：`npm test`
   - 结果：`pass=65, fail=0, todo=7`
2. 终端多实例脚手架：`npm run test:terminal-multi-instance:scaffold`
   - 结果：`pass=2, fail=0, todo=7`
3. 实现级复验（代码路径核对）
   - 入口按钮行为：`SessionsFooter -> onOpenNewSession`（打开新建会话弹窗）
   - 右上角按钮：`TerminalHeader` 仅 `最大化/关闭`
   - shell 类型：`ShellType = 'powershell' | 'pwsh' | 'cmd'`
   - 底部终端收起状态：`uiStore` 无 terminal panel 展开/收起状态字段

## 高风险路径复测结果

| 路径 | 结果 | 说明 |
| --- | --- | --- |
| 快速连点“新增终端” | 失败（阻塞） | 当前不存在“右上角新增终端”入口，仅有会话创建流程，无法执行目标路径 |
| 高频页签切换 | 部分通过 | 现有会话 Tab 切换机制存在，且内容区采用常驻挂载+display 切换，减少重挂载风险 |
| 收起后再次展开 | 失败（阻塞） | 当前未实现底部终端窗口展开/收起能力，无法验证状态一致性 |

## 缺陷分级

### 阻塞

1. `BLK-01` 左下角入口行为与需求不符
- 现象：左下角按钮为“新建会话”，点击打开新建会话对话框，不是“底部终端入口”
- 影响：入口场景无法通过，后续底部面板链路全部不可测
- 证据：`src/renderer/components/layout/sidebar/SessionsFooter.tsx`

2. `BLK-02` 底部终端窗口展开/收起能力缺失
- 现象：未发现底部终端面板状态与收起/展开控制
- 影响：高风险路径“收起后展开”不可执行
- 证据：`src/renderer/stores/uiStore.ts`（仅 `toggleSidebar/toggleDetailPanel`）

3. `BLK-03` 右上角新增 zsh/bash/sh 终端能力缺失
- 现象：终端头部仅最大化与关闭，无新增入口；shell 类型仍为 windows 三种
- 影响：多实例新增与 shell 维度联调不可执行
- 证据：`src/renderer/components/terminal/TerminalHeader.tsx`、`src/shared/types.ts`

### 高

4. `HIGH-01` 多实例并行可用性不可验（被阻塞缺陷前置拦截）
- 现象：由于新增多终端入口缺失，无法进行并发输入与隔离复测
- 影响：并发稳定性风险未知
- 证据：`tests/terminalMultiInstanceRegressionScaffold.test.ts` 当前 7 个关键场景为 TODO

### 中

5. `MED-01` 自动化覆盖尚未落地到真实断言
- 现象：多终端专项脚手架已建，但关键用例仍为占位
- 影响：联调后若不及时补断言，仍可能“测试通过但功能未验真”
- 证据：`npm run test:terminal-multi-instance:scaffold` 输出 `todo=7`

### 低

- 暂无新增低等级缺陷。

## 复测结论

- 本轮结论：`NO-GO`
- 原因：3 个阻塞缺陷未解除（入口、底部收起、右上新增 shell）
- 建议复测触发条件：
  1. 实现左下角入口 -> 底部终端面板链路
  2. 实现底部面板展开/收起状态机
  3. 实现右上角新增终端与 `zsh/bash/sh` 类型创建
  4. 将 7 条 TODO 用例替换为可执行断言后再跑联调回归
