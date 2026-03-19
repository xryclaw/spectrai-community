/**
 * Worktree 风险防护与阈值告警
 */

type CleanupPendingItem = {
  key: string
  reason?: string
  createdAt: number
}

type FallbackSample = {
  used: boolean
  ts: number
}

type MergeGateMetric = 'PROVISION_FAILED' | 'CLEANUP_PENDING' | 'FALLBACK_RATE'

type MergeGateBreach = {
  metric: MergeGateMetric
  value: number
  threshold: string
}

type RiskSnapshot = {
  provisionFailedIn30Min: number
  cleanupPending: number
  fallbackRateIn30Min: number
  fallbackSamples: number
}

type MergeGateState = {
  paused: boolean
  triggerAt: number | null
  triggerMetric: MergeGateMetric | null
  triggerValue: number | null
  triggerThreshold: string | null
  impactScope: string
  recoveryCondition: string
  lastResolvedAt: number | null
}

export class WorktreeRiskGuard {
  private static _instance: WorktreeRiskGuard | null = null

  private provisionFailures: number[] = []
  private cleanupPending = new Map<string, CleanupPendingItem>()
  private fallbackSamples: FallbackSample[] = []

  private readonly provisionWindowMs = 30 * 60 * 1000
  private readonly provisionFailureThreshold = 3
  private readonly cleanupPendingThreshold = 20
  private readonly fallbackRateThreshold = 0.05
  private readonly fallbackWindowMs = 30 * 60 * 1000

  private mergeGateState: MergeGateState = {
    paused: false,
    triggerAt: null,
    triggerMetric: null,
    triggerValue: null,
    triggerThreshold: null,
    impactScope: '暂停所有 Worktree 相关合并（IPC + Agent merge_worktree）',
    recoveryCondition: '30分钟窗口内 PROVISION_FAILED<3 且 CLEANUP_PENDING<=20 且 fallbackRate<=5%',
    lastResolvedAt: null,
  }

  static getInstance(): WorktreeRiskGuard {
    if (!this._instance) {
      this._instance = new WorktreeRiskGuard()
    }
    return this._instance
  }

  private constructor() {}

  private formatTs(ts: number): string {
    return new Date(ts).toISOString()
  }

  private pruneWindows(now: number): void {
    this.provisionFailures = this.provisionFailures.filter(ts => now - ts <= this.provisionWindowMs)
    this.fallbackSamples = this.fallbackSamples.filter(sample => now - sample.ts <= this.fallbackWindowMs)
  }

  private buildSnapshot(now = Date.now()): RiskSnapshot {
    this.pruneWindows(now)

    const fallbackUsed = this.fallbackSamples.filter(sample => sample.used).length
    const fallbackRate = this.fallbackSamples.length > 0 ? (fallbackUsed / this.fallbackSamples.length) : 0

    return {
      provisionFailedIn30Min: this.provisionFailures.length,
      cleanupPending: this.cleanupPending.size,
      fallbackRateIn30Min: fallbackRate,
      fallbackSamples: this.fallbackSamples.length,
    }
  }

  private pickBreach(snapshot: RiskSnapshot): MergeGateBreach | null {
    if (snapshot.provisionFailedIn30Min >= this.provisionFailureThreshold) {
      return {
        metric: 'PROVISION_FAILED',
        value: snapshot.provisionFailedIn30Min,
        threshold: `PROVISION_FAILED>=${this.provisionFailureThreshold} (30m)`,
      }
    }
    if (snapshot.cleanupPending > this.cleanupPendingThreshold) {
      return {
        metric: 'CLEANUP_PENDING',
        value: snapshot.cleanupPending,
        threshold: `CLEANUP_PENDING>${this.cleanupPendingThreshold}`,
      }
    }
    if (snapshot.fallbackRateIn30Min > this.fallbackRateThreshold) {
      return {
        metric: 'FALLBACK_RATE',
        value: snapshot.fallbackRateIn30Min,
        threshold: `fallbackRate>${(this.fallbackRateThreshold * 100).toFixed(2)}% (30m)`,
      }
    }
    return null
  }

  private evaluateMergeGate(source: string): void {
    const now = Date.now()
    const snapshot = this.buildSnapshot(now)
    const breach = this.pickBreach(snapshot)

    if (breach) {
      if (!this.mergeGateState.paused) {
        this.mergeGateState = {
          ...this.mergeGateState,
          paused: true,
          triggerAt: now,
          triggerMetric: breach.metric,
          triggerValue: breach.value,
          triggerThreshold: breach.threshold,
        }

        console.error(
          `[WORKTREE_MERGE_GATE_TRIGGER] source=${source} triggerAt=${this.formatTs(now)} threshold=${breach.threshold} value=${typeof breach.value === 'number' ? breach.value : String(breach.value)} impactScope=${this.mergeGateState.impactScope} recoveryCondition=${this.mergeGateState.recoveryCondition}`
        )
      }
      return
    }

    if (this.mergeGateState.paused) {
      const prevTriggerAt = this.mergeGateState.triggerAt
      this.mergeGateState = {
        ...this.mergeGateState,
        paused: false,
        triggerAt: null,
        triggerMetric: null,
        triggerValue: null,
        triggerThreshold: null,
        lastResolvedAt: now,
      }

      console.error(
        `[WORKTREE_MERGE_GATE_RESOLVED] source=${source} resolvedAt=${this.formatTs(now)} previousTriggerAt=${prevTriggerAt ? this.formatTs(prevTriggerAt) : 'n/a'} recoveryConditionMet=${this.mergeGateState.recoveryCondition} snapshot=${JSON.stringify(snapshot)}`
      )
    }
  }

  recordProvisionFailure(reason: string): void {
    const now = Date.now()
    this.provisionFailures.push(now)
    this.provisionFailures = this.provisionFailures.filter(ts => now - ts <= this.provisionWindowMs)

    console.error(`[WORKTREE][PROVISION_FAILED] ${reason}`)
    if (this.provisionFailures.length >= this.provisionFailureThreshold) {
      console.error(
        `[WORKTREE_RISK_ESCALATION] 30分钟内 PROVISION_FAILED=${this.provisionFailures.length}，达到阈值(>=${this.provisionFailureThreshold})`
      )
    }

    this.evaluateMergeGate('recordProvisionFailure')
  }

  recordCleanupPending(key: string, reason?: string): void {
    if (!this.cleanupPending.has(key)) {
      this.cleanupPending.set(key, { key, reason, createdAt: Date.now() })
    }
    const pendingCount = this.cleanupPending.size
    if (pendingCount > this.cleanupPendingThreshold) {
      console.error(
        `[WORKTREE_RISK_ESCALATION] CLEANUP_PENDING=${pendingCount}，超过阈值(>${this.cleanupPendingThreshold})`
      )
    }

    this.evaluateMergeGate('recordCleanupPending')
  }

  recordCleanupResolved(key: string): void {
    this.cleanupPending.delete(key)
    this.evaluateMergeGate('recordCleanupResolved')
  }

  recordFallbackAttempt(used: boolean): void {
    const now = Date.now()
    this.fallbackSamples.push({ used, ts: now })
    this.fallbackSamples = this.fallbackSamples.filter(sample => now - sample.ts <= this.fallbackWindowMs)

    if (this.fallbackSamples.length > 0) {
      const usedCount = this.fallbackSamples.filter(sample => sample.used).length
      const rate = usedCount / this.fallbackSamples.length
      if (rate > this.fallbackRateThreshold) {
        console.error(
          `[WORKTREE_RISK_ESCALATION] fallback 使用率=${(rate * 100).toFixed(2)}%，超过阈值>${this.fallbackRateThreshold * 100}%`
        )
      }
    }

    this.evaluateMergeGate('recordFallbackAttempt')
  }

  assertMergeAllowed(source: string): {
    allowed: boolean
    reason?: string
    triggerAt?: string
    threshold?: string
    impactScope?: string
    recoveryCondition?: string
    snapshot: RiskSnapshot
  } {
    this.evaluateMergeGate(`assertMergeAllowed:${source}`)
    const snapshot = this.buildSnapshot()

    if (!this.mergeGateState.paused) {
      return { allowed: true, snapshot }
    }

    const triggerAt = this.mergeGateState.triggerAt
    const reason = this.mergeGateState.triggerMetric
      ? `触发指标 ${this.mergeGateState.triggerMetric} 达到阈值`
      : '触发风险阈值'

    console.error(
      `[WORKTREE_MERGE_GATE_BLOCK] source=${source} triggerAt=${triggerAt ? this.formatTs(triggerAt) : 'n/a'} threshold=${this.mergeGateState.triggerThreshold || 'n/a'} impactScope=${this.mergeGateState.impactScope}`
    )

    return {
      allowed: false,
      reason,
      triggerAt: triggerAt ? this.formatTs(triggerAt) : undefined,
      threshold: this.mergeGateState.triggerThreshold || undefined,
      impactScope: this.mergeGateState.impactScope,
      recoveryCondition: this.mergeGateState.recoveryCondition,
      snapshot,
    }
  }

  getSnapshot(): RiskSnapshot {
    const snapshot = this.buildSnapshot()
    this.evaluateMergeGate('getSnapshot')
    return snapshot
  }
}
