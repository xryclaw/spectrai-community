# Worktree 联调测试数据与执行步骤包

## 1. 产物清单

- 测试数据: `tests/fixtures/worktree-integration-data.json`
- 前置环境检查脚本: `scripts/worktree-preflight.sh`
- 并行隔离 + 分支回合并冒烟脚本: `scripts/worktree-integration-smoke.sh`
- 并发隔离与失败恢复回归清单: `docs/plans/2026-03-19-worktree-concurrency-recovery-regression.md`
- 最终验收执行编排: `docs/plans/2026-03-19-worktree-final-acceptance-orchestration.md`
- 最终回归预编排与证据模板（待后端命令清单后即跑）: `docs/plans/2026-03-19-worktree-final-regression-preplan-and-evidence-template.md`

## 2. 前置环境检查清单

执行命令:

```bash
bash scripts/worktree-preflight.sh
```

检查项与判定标准:

| 检查项 | 输入 | 预期输出 | 通过标准 |
|---|---|---|---|
| 基础命令可用 | 当前机器环境 | `[OK] command 'git'/'node'/'npm' is available` | 无 `[FAIL]` |
| 仓库有效性 | 仓库路径 | `[OK] path is inside a git repository` | 无 `[FAIL]` |
| worktree 能力 | git 版本与能力 | `[OK] git worktree command is available` | 无 `[FAIL]` |
| 基线分支识别 | 本地分支 | `[OK] base branch detected: <branch-name>` | 必须识别成功 |
| remote 配置 | origin 远程 | `[OK] origin remote configured ...` 或 `[WARN]` | 允许 warning，不允许 fail |
| 工作区状态 | git status | clean 输出 `[OK]`，dirty 输出 `[WARN]` | 允许 warning，不允许 fail |

失败处理:

- 出现 `[FAIL]` 时停止联调，先修复环境问题再继续。

## 3. 联调测试数据说明

数据文件: `tests/fixtures/worktree-integration-data.json`

关键字段:

- `baseBranchCandidates`: 基线分支候选（main/master）
- `sessionTemplates`: A/B 会话命名、分支前缀、worktree 路径前缀、探针文件、提交信息
- `uiCases`: 默认勾选与取消勾选场景
- `assertions`: 隔离、分支流转、回合并、失败恢复验收语义

## 4. 可直接执行的联调脚本步骤模板

### 4.1 Git 级联调冒烟（自动）

执行命令:

```bash
bash scripts/worktree-integration-smoke.sh
```

步骤模板（脚本内部执行逻辑）:

| 步骤 | 输入 | 输出 | 判定标准 |
|---|---|---|---|
| S1 预检查 | repo 路径 | preflight 日志 | 无 `[FAIL]` |
| S2 临时克隆 | 当前仓库 | 临时 clone 目录 | clone 成功 |
| S3 创建 A/B worktree | 基线分支 + 动态分支名 | 2 个 worktree 目录 | A/B 当前分支与预期一致 |
| S4 并行隔离验证 | 在 A 新增未提交探针文件 | B 不可见 A 探针文件 | B 目录不存在 A 探针文件 |
| S5 分支提交验证 | A/B 各自提交 | 两个分支分别生成 commit | commit 成功且不在 base 分支 |
| S6 回合并路径验证 | base 分支合并 A/B | base 同时含 A/B 探针文件 | 两次 merge 成功，文件存在 |
| S7 收尾 | 临时资源 | 自动清理（默认） | 脚本返回码 0 |

备注:

- 需要保留临时目录用于排查时可执行: `KEEP_TMP=1 bash scripts/worktree-integration-smoke.sh`

### 4.2 产品功能联调（手工 + 证据采集）

> 前后端提交完成后执行，用于覆盖默认勾选行为与真实会话路径。

| 步骤 | 输入 | 输出 | 判定标准 |
|---|---|---|---|
| U1 默认勾选检查 | 打开“新建会话开发需求”弹窗 | `使用 git worktree` 默认勾选 | 默认值必须为勾选 |
| U2 取消勾选回归 | 手动取消勾选后创建会话 | 会话按非 worktree 旧路径创建 | 与历史行为一致，无报错 |
| U3 并行隔离 | 勾选状态下创建会话 A/B 并分别改同一路径 | A/B 改动互不污染 | 会话间 `git status` 不串扰 |
| U4 分支提交 | 在 A/B 分别提交 | 各自新分支存在提交记录 | 提交不落在 main/master |
| U5 回合并链路 | 走 PR/MR 或系统合并入口 | 主分支收到变更 | 合并记录可追溯，构建/测试通过 |
| U6 失败恢复 | 模拟创建失败/中断 | 明确错误与可恢复路径 | 无僵尸状态、可重试 |

证据要求:

- 每一步至少保留 1 份证据（终端输出或界面截图）
- 缺陷记录必须关联步骤编号（Sx/Ux）与复现输入

## 5. 缺陷与回归结论模板

### 缺陷记录模板

| 字段 | 内容 |
|---|---|
| 缺陷ID | WT-BUG-XXX |
| 对应用例 | WT-xxx / Sx / Ux |
| 严重级别 | P0/P1/P2/P3 |
| 复现步骤 | 精确到输入与命令 |
| 实际结果 | 现象 + 日志摘要 |
| 期望结果 | 对应验收标准 |
| 当前状态 | Open / Fixed / Verified |

### 回归结论口径

- 可发布: 主链路全通过，且 P0/P1 为 0
- 暂不可发布: 任一主链路失败，或存在未关闭 P0/P1
