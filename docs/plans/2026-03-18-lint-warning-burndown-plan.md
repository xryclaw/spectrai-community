# Lint Warning 收敛计划（72 → 61）

日期：2026-03-18
目标：对 warning 进行风险分级、责任映射，并完成首批高风险清理验证。

## 基线与现状

1. 基线（接任务前）：72 warnings
2. 首批清理后：61 warnings（-11）
3. 当前分布：
   - `@typescript-eslint/no-unused-vars`: 46
   - `react-hooks/exhaustive-deps`: 15

## 风险分级与责任映射

### P0 高风险（本周必须）
1. 规则：`react-hooks/rules-of-hooks`（已清零）
2. 风险：Hook 调用顺序不稳定，可能触发运行时错误或状态错乱
3. 负责人：前端
4. 首批已完成文件：
   - `src/renderer/components/conversation/FileChangeCard.tsx`
   - `src/renderer/components/layout/sidebar/SessionItem.tsx`

### P1 中风险（本周优先）
1. 规则：`react-hooks/exhaustive-deps`（剩余 15）
2. 风险：副作用闭包陈旧、状态更新时机错误
3. 负责人：前端
4. 优先目录：
   - `src/renderer/components/layout/*`
   - `src/renderer/components/kanban/*`
   - `src/renderer/components/settings/*`

### P2 低到中风险（下周持续）
1. 规则：`@typescript-eslint/no-unused-vars`（剩余 46）
2. 风险：可维护性下降、死代码积累
3. 负责人：前端 + 后端（按目录归属）
4. 优先策略：
   - 先删除明显无用变量/导入
   - 再对保留占位变量使用 `_` 前缀并补注释说明

## 可执行收敛清单

## 本周（W1）
1. 清零 `react-hooks/rules-of-hooks`（已完成）。
2. 将 `react-hooks/exhaustive-deps` 从 15 降到 <= 5。
3. 在不影响行为前提下，将 `no-unused-vars` 从 46 降到 <= 30。
4. 门禁要求：`lint/typecheck/test` 三项持续通过。

## 下周（W2）
1. 清零 `react-hooks/exhaustive-deps`。
2. 将 `no-unused-vars` 降到 <= 10。
3. 达标后将 `react-hooks/rules-of-hooks` 从 warning 提升回 error。
4. 评估将 `react-hooks/exhaustive-deps` 提升回 error 的窗口。

## 首批清理验证结果

1. `npm run lint`：通过（0 error，61 warnings）
2. `npm run typecheck`：通过
3. `npm run test`：通过（20/20）

## 备注

1. 当前 CI 门禁稳定可用；warning 收敛按周推进，不阻塞主干。
2. 后续每次清理建议按规则类型分批提交，避免混入功能改动。
