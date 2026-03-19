# P0 二轮复测证据模板（RET-001/002/003/005/007/008）

- 任务ID：`7b6086dd-04db-4c80-8b77-221c9f0fca33`
- 关联前端任务：`5320d318-39ca-499e-87aa-98912818add7`
- 执行人：`qa`
- 执行时间：`<YYYY-MM-DD HH:mm:ss +TZ>`

## 1) 门禁命令证据

```bash
node scripts/run-ret-second-pass.mjs
npm run -s test:gate2:p0
npm run -s typecheck:web
npm run -s test
```

结果摘要：
- RET 自动脚本：`<PASS/FAIL>`
- `test:gate2:p0`：`<PASS/FAIL>`
- `typecheck:web`：`<PASS/FAIL>`
- `test`：`<PASS/FAIL>`

## 2) 逐项复测结论

| RET | 对应DEF | 结果 | 证据（文件/日志/截图位点） | 备注 |
|---|---|---|---|---|
| RET-001 | DEF-001 | `<PASS/FAIL>` | `<evidence>` | `<note>` |
| RET-002 | DEF-002 | `<PASS/FAIL>` | `<evidence>` | `<note>` |
| RET-003 | DEF-003 | `<PASS/FAIL>` | `<evidence>` | `<note>` |
| RET-005 | DEF-005 | `<PASS/FAIL>` | `<evidence>` | `<note>` |
| RET-007 | DEF-007 | `<PASS/FAIL>` | `<evidence>` | `<note>` |
| RET-008 | DEF-008 | `<PASS/FAIL>` | `<evidence>` | `<note>` |

## 3) 与首轮差异对比

| DEF | 首轮结果 | 二轮结果 | 变化 | 结论 |
|---|---|---|---|---|
| DEF-001 | FAIL | `<PASS/FAIL>` | `<changed/unchanged>` | `<close/open>` |
| DEF-002 | FAIL | `<PASS/FAIL>` | `<changed/unchanged>` | `<close/open>` |
| DEF-003 | FAIL | `<PASS/FAIL>` | `<changed/unchanged>` | `<close/open>` |
| DEF-005 | FAIL | `<PASS/FAIL>` | `<changed/unchanged>` | `<close/open>` |
| DEF-007 | FAIL | `<PASS/FAIL>` | `<changed/unchanged>` | `<close/open>` |
| DEF-008 | FAIL | `<PASS/FAIL>` | `<changed/unchanged>` | `<close/open>` |

## 4) 放行建议

- 建议：`<GO / CONDITIONAL-GO / NO-GO>`
- 理由：
1. `<reason-1>`
2. `<reason-2>`

- 若为 `CONDITIONAL-GO`，前置条件：
1. `<condition-1>`
2. `<condition-2>`

- 若为 `NO-GO`，责任建议：
1. `<owner + action>`
2. `<owner + action>`
