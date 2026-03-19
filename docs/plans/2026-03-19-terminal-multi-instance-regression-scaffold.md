# 2026-03-19 终端多实例回归测试脚手架（预置）

## 目标

在前后端合并终端多实例功能前，先固定回归范围与自动化骨架，确保合并后可直接补齐断言并执行。

## 回归范围（第一轮）

| ID | 场景 | 覆盖点 | 优先级 | 自动化状态 |
| --- | --- | --- | --- | --- |
| TM-ENTRY-001 | 左下角入口触发 | 入口可见、可点击、触发底部面板展开 | P0 | TODO（骨架已建） |
| TM-PANEL-002 | 底部面板展开/收起 | 展开/收起状态、焦点、可恢复性 | P0 | TODO（骨架已建） |
| TM-CREATE-003 | 右上角新增实例 | 多实例创建、激活、关闭 | P0 | TODO（骨架已建） |
| TM-SHELL-004 | shell 类型创建 | zsh/bash/shell 参数下发与失败回退 | P0 | TODO（骨架已建） |
| TM-TABS-005 | 多标签切换 | 左上角标签切换、渲染切换、状态保留 | P1 | TODO（骨架已建） |
| TM-ISOLATION-006 | 会话隔离与生命周期 | 输入输出隔离、保活、销毁清理 | P1 | TODO（骨架已建） |
| TM-EXCEPTION-007 | 异常回退 | 启动失败、异常退出、状态一致性 | P1 | TODO（骨架已建） |

## 自动化骨架文件

- `tests/terminalMultiInstanceRegressionScaffold.test.ts`

当前包含：
1. 回归场景 ID 完整性校验（防止范围漂移）
2. 关键锚点文件存在性校验（为后续断言加固提供挂点）
3. 7 个 `test.todo(...)` 用例占位（与上述场景一一对应）

## 执行方式

```bash
npm run test:terminal-multi-instance:scaffold
```

或：

```bash
node --test --experimental-strip-types tests/terminalMultiInstanceRegressionScaffold.test.ts
```

## 第二轮补齐（待前后端合并后）

1. 将 `test.todo` 替换为可执行断言（UI 层 + store 层 + IPC 层）
2. 引入 shell 类型枚举断言（zsh/bash/shell）
3. 增加会话销毁后资源释放断言（listeners/timers/pty handle）
4. 将该用例纳入发版 Gate 套件

## 出口标准（合并后）

1. P0 场景 100% 通过
2. P1 场景无阻断缺陷
3. 无跨终端会话串扰
4. 异常回退文案与状态一致
