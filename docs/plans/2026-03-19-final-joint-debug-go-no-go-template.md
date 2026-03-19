# 最终联调准入判定模板（frontend/backend/qa 证据到齐即裁决）

> 使用说明：收到 frontend / backend / qa 任一新证据后，按本模板更新；三方关键证据到齐后，5 分钟内给出 `GO / NO-GO`。

## 0. 判定元信息

- 判定时间：`<YYYY-MM-DD HH:mm:ss>`
- 判定人：`<architect/leader>`
- 判定范围：`<本次联调范围/分支/版本>`
- 证据截止时间：`<YYYY-MM-DD HH:mm:ss>`

## 1. 新证据回填区（frontend / backend / qa）

### 1.1 frontend
- 任务/PR：`<ID>`
- 结论：`PASS / FAIL / BLOCKED`
- 关键门禁：`typecheck:web / test / UI回归`（填结果）
- 证据链接：`<doc/log/screenshot>`
- 备注：`<可选>`

### 1.2 backend
- 任务/PR：`<ID>`
- 结论：`PASS / FAIL / BLOCKED`
- 关键门禁：`typecheck:node / test / IPC契约`（填结果）
- 证据链接：`<doc/log/screenshot>`
- 备注：`<可选>`

### 1.3 qa
- 任务/用例批次：`<ID>`
- 结论：`PASS / FAIL / BLOCKED`
- 关键门禁：`回归集 / 阻断用例 / 冒烟`（填结果）
- 证据链接：`<doc/log/screenshot>`
- 备注：`<可选>`

## 2. 准入硬条件（任一不满足即 NO-GO）

- [ ] frontend 关键门禁全绿（无 P0/P1 未闭环）
- [ ] backend 关键门禁全绿（无 P0/P1 未闭环）
- [ ] qa 阻断级用例全绿（P0=0，P1=0）
- [ ] Worktree 阈值门禁未触发暂停：
  - `PROVISION_FAILED(30m) < 3`
  - `CLEANUP_PENDING <= 20`
  - `fallbackRate(30m) <= 5%`
- [ ] 无新增跨端回归阻断（会话创建/并发隔离/合并回收）

## 3. 即时裁决

- 最终结论：`GO / NO-GO`
- 判定理由（1~3 行）：
  1. `<理由1>`
  2. `<理由2>`
  3. `<理由3>`

## 4. 未闭环阻断项清单（NO-GO 必填）

| 阻断ID | 级别(P0/P1) | 所属(frontend/backend/qa) | 现象 | 影响范围 | 证据 | 责任人 | 修复截止时间 | 当前状态 |
|---|---|---|---|---|---|---|---|---|
| `<BLK-001>` | `<P0/P1>` | `<frontend/backend/qa>` | `<一句话问题描述>` | `<功能/用户面>` | `<link>` | `<owner>` | `<YYYY-MM-DD HH:mm>` | `<open/fixing/verifying>` |

> 规则：`GO` 时此表可为空；`NO-GO` 时必须至少 1 条，且每条都有证据与负责人。

## 5. 对外发布口径（可直接复制）

### 5.1 GO 口径

```text
【最终联调准入判定】
结论：GO
时间：<YYYY-MM-DD HH:mm:ss>
依据：frontend/backend/qa 新证据已回填，关键门禁全部通过，且无未闭环阻断项。
执行：按既定合并/发布窗口推进；若出现新增阻断，立即回切 NO-GO 流程。
```

### 5.2 NO-GO 口径

```text
【最终联调准入判定】
结论：NO-GO
时间：<YYYY-MM-DD HH:mm:ss>
依据：存在未闭环阻断项（见阻断清单），当前不满足准入硬条件。
执行：冻结相关合并，仅允许阻断修复与证据回填；修复完成后立即复判。
```

## 6. 复判触发条件

- frontend / backend / qa 任一方提交“阻断项已修复 + 新证据链接”
- Worktree 阈值门禁状态由触发转为解除（有日志证据）
- Leader 要求立即复判
