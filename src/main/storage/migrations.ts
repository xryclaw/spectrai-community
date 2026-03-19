/**
 * migrations.ts — 版本化数据库迁移定义
 * 每个 Migration 包含版本号、描述和 up() 回调。
 * 从原 Database.ts migrateSchema() 拆出，保持执行顺序不变。
 * @author weibin
 */

import { BUILTIN_PROVIDERS } from '../../shared/types'

/** 单条迁移定义 */
export interface Migration {
  /** 唯一递增版本号 */
  version: number
  /** 迁移简要描述（仅用于日志） */
  description: string
  /** 执行迁移（db 为 better-sqlite3 实例） */
  up(db: any): void
}

// ─── 迁移辅助工具 ───

/** 检查某表是否存在 */
function tableExists(db: any, tableName: string): boolean {
  return !!db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName)
}

/** 获取表的所有列名 */
function getColumnNames(db: any, tableName: string): string[] {
  const cols = db.prepare(`PRAGMA table_info('${tableName}')`).all() as any[]
  return cols.map((c: any) => c.name)
}

/** 如果列不存在则添加 */
function addColumnIfNotExists(db: any, table: string, column: string, definition: string): boolean {
  const cols = getColumnNames(db, table)
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    return true
  }
  return false
}

// ─── 所有版本化迁移（按原 migrateSchema 中的顺序排列）───

export const MIGRATIONS: Migration[] = [
  // ── v1: sessions.claude_session_id ──
  {
    version: 1,
    description: 'add claude_session_id column to sessions',
    up(db) {
      addColumnIfNotExists(db, 'sessions', 'claude_session_id', 'TEXT')
    },
  },

  // ── v2: ai_providers 表 ──
  {
    version: 2,
    description: 'create ai_providers table',
    up(db) {
      if (!tableExists(db, 'ai_providers')) {
        db.exec(`
          CREATE TABLE ai_providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            command TEXT NOT NULL,
            is_builtin INTEGER NOT NULL DEFAULT 0,
            icon TEXT,
            default_args TEXT,
            auto_accept_arg TEXT,
            resume_arg TEXT,
            session_id_detection TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `)
      }
    },
  },

  // ── v3: ai_providers 新增列（node_version, env_overrides 等）──
  {
    version: 3,
    description: 'add node_version / env_overrides / resume_format / session_id_pattern / executable_path to ai_providers',
    up(db) {
      if (!tableExists(db, 'ai_providers')) return
      addColumnIfNotExists(db, 'ai_providers', 'session_id_detection', 'TEXT')
      addColumnIfNotExists(db, 'ai_providers', 'node_version', 'TEXT')
      addColumnIfNotExists(db, 'ai_providers', 'env_overrides', 'TEXT')
      addColumnIfNotExists(db, 'ai_providers', 'resume_format', 'TEXT')
      addColumnIfNotExists(db, 'ai_providers', 'session_id_pattern', 'TEXT')
      addColumnIfNotExists(db, 'ai_providers', 'executable_path', 'TEXT')
    },
  },

  // ── v4: ai_providers.sort_order ──
  {
    version: 4,
    description: 'add sort_order column to ai_providers',
    up(db) {
      if (!tableExists(db, 'ai_providers')) return
      addColumnIfNotExists(db, 'ai_providers', 'sort_order', 'INTEGER NOT NULL DEFAULT 0')
    },
  },

  // ── v5: ai_providers.git_bash_path ──
  {
    version: 5,
    description: 'add git_bash_path column to ai_providers',
    up(db) {
      if (!tableExists(db, 'ai_providers')) return
      addColumnIfNotExists(db, 'ai_providers', 'git_bash_path', 'TEXT')
    },
  },

  // ── v6: ai_providers.default_model ──
  {
    version: 6,
    description: 'add default_model column to ai_providers',
    up(db) {
      if (!tableExists(db, 'ai_providers')) return
      addColumnIfNotExists(db, 'ai_providers', 'default_model', 'TEXT')
    },
  },

  // ── v7: 内置 provider upsert ──
  {
    version: 7,
    description: 'upsert builtin providers',
    up(db) {
      if (!tableExists(db, 'ai_providers')) return
      const cols = getColumnNames(db, 'ai_providers')
      if (!cols.includes('name')) return  // 表结构不完整则跳过

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO ai_providers (
          id, name, command, is_builtin, icon, default_args,
          auto_accept_arg, resume_arg, session_id_detection,
          node_version, env_overrides, resume_format,
          session_id_pattern, executable_path
        ) VALUES (
          @id, @name, @command, @is_builtin, @icon, @default_args,
          @auto_accept_arg, @resume_arg, @session_id_detection,
          @node_version, @env_overrides, @resume_format,
          @session_id_pattern, @executable_path
        )
      `)
      for (const p of BUILTIN_PROVIDERS) {
        stmt.run({
          id: p.id,
          name: p.name,
          command: p.command,
          is_builtin: 1,
          icon: p.icon || null,
          default_args: p.defaultArgs ? JSON.stringify(p.defaultArgs) : null,
          auto_accept_arg: p.autoAcceptArg || null,
          resume_arg: p.resumeArg || null,
          session_id_detection: p.sessionIdDetection || null,
          node_version: (p as any).nodeVersion || null,
          env_overrides: (p as any).envOverrides ? JSON.stringify((p as any).envOverrides) : null,
          resume_format: (p as any).resumeFormat || null,
          session_id_pattern: (p as any).sessionIdPattern || null,
          executable_path: (p as any).executablePath || null,
        })
      }
    },
  },

  // ── v8: 清理已移除的 aider provider ──
  {
    version: 8,
    description: 'delete removed aider provider',
    up(db) {
      if (!tableExists(db, 'ai_providers')) return
      try {
        db.exec("DELETE FROM ai_providers WHERE id = 'aider' AND is_builtin = 1")
      } catch { /* ignore */ }
    },
  },

  // ── v9: sessions.provider_id + sessions.name_locked ──
  {
    version: 9,
    description: 'add provider_id and name_locked columns to sessions',
    up(db) {
      addColumnIfNotExists(db, 'sessions', 'provider_id', 'TEXT')
      addColumnIfNotExists(db, 'sessions', 'name_locked', 'INTEGER NOT NULL DEFAULT 0')
    },
  },

  // ── v12: session_summaries 表 ──
  {
    version: 12,
    description: 'create session_summaries table',
    up(db) {
      if (!tableExists(db, 'session_summaries')) {
        db.exec(`
          CREATE TABLE session_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            summary TEXT,
            key_points TEXT,
            ai_provider TEXT,
            ai_model TEXT,
            input_tokens INTEGER,
            output_tokens INTEGER,
            type TEXT NOT NULL DEFAULT 'summary',
            content TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_session_summaries_session
            ON session_summaries(session_id, created_at);
        `)
      }
    },
  },

  // ── v13: ai_call_logs 表 ──
  {
    version: 13,
    description: 'create ai_call_logs table',
    up(db) {
      if (!tableExists(db, 'ai_call_logs')) {
        db.exec(`
          CREATE TABLE ai_call_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            call_type TEXT NOT NULL,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            session_id TEXT,
            input_tokens INTEGER,
            output_tokens INTEGER,
            duration_ms INTEGER,
            cost_estimate REAL,
            status TEXT NOT NULL DEFAULT 'success',
            error TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_ai_call_logs_session
            ON ai_call_logs(session_id, created_at);
          CREATE INDEX IF NOT EXISTS idx_ai_call_logs_type
            ON ai_call_logs(call_type, created_at);
        `)
      }
    },
  },

  // ── v14: plan_executions 表 ──
  {
    version: 14,
    description: 'create plan_executions table',
    up(db) {
      if (!tableExists(db, 'plan_executions')) {
        db.exec(`
          CREATE TABLE plan_executions (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            plan_content TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            current_step INTEGER DEFAULT 0,
            total_steps INTEGER DEFAULT 0,
            step_results TEXT,
            started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
          );
          CREATE INDEX IF NOT EXISTS idx_plan_executions_session
            ON plan_executions(session_id);
        `)
      }
    },
  },

  // ── v15: tasks worktree 列 ──
  {
    version: 15,
    description: 'add worktree columns to tasks',
    up(db) {
      addColumnIfNotExists(db, 'tasks', 'worktree_enabled', 'INTEGER NOT NULL DEFAULT 0')
      addColumnIfNotExists(db, 'tasks', 'git_repo_path', 'TEXT')
      addColumnIfNotExists(db, 'tasks', 'git_branch', 'TEXT')
      addColumnIfNotExists(db, 'tasks', 'worktree_path', 'TEXT')
    },
  },

  // ── v16: conversation_messages 表 ──
  {
    version: 16,
    description: 'create conversation_messages table',
    up(db) {
      if (!tableExists(db, 'conversation_messages')) {
        db.exec(`
          CREATE TABLE conversation_messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            message_id TEXT,
            role TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'text',
            content TEXT,
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            attachments TEXT,
            tool_name TEXT,
            tool_input TEXT,
            tool_result TEXT,
            is_error INTEGER NOT NULL DEFAULT 0,
            thinking_text TEXT,
            usage_input_tokens INTEGER,
            usage_output_tokens INTEGER,
            tool_use_id TEXT,
            file_change TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_conv_messages_session ON conversation_messages(session_id, timestamp);
        `)
      } else {
        addColumnIfNotExists(db, 'conversation_messages', 'attachments', 'TEXT')
        addColumnIfNotExists(db, 'conversation_messages', 'file_change', 'TEXT')
        addColumnIfNotExists(db, 'conversation_messages', 'message_id', 'TEXT')
      }
    },
  },

  // ── v17: app_settings 表 ──
  {
    version: 17,
    description: 'create app_settings table',
    up(db) {
      if (!tableExists(db, 'app_settings')) {
        db.exec(`
          CREATE TABLE app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)
      }
    },
  },

  // ── v18: workspaces 和 workspace_repos 表 ──
  {
    version: 18,
    description: 'create workspaces and workspace_repos tables',
    up(db) {
      if (!tableExists(db, 'workspaces')) {
        db.exec(`
          CREATE TABLE workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            root_path TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE workspace_repos (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            repo_path TEXT NOT NULL,
            name TEXT NOT NULL,
            is_primary INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            UNIQUE(workspace_id, repo_path)
          );
          CREATE INDEX idx_workspace_repos_workspace ON workspace_repos(workspace_id);
        `)
      }
    },
  },

  // ── v19: tasks.workspace_id + tasks.worktree_paths ──
  {
    version: 19,
    description: 'add workspace_id and worktree_paths to tasks',
    up(db) {
      addColumnIfNotExists(db, 'tasks', 'workspace_id', 'TEXT')
      addColumnIfNotExists(db, 'tasks', 'worktree_paths', 'TEXT')
    },
  },

  // ── v20: mcp_servers 表 ──
  {
    version: 20,
    description: 'create mcp_servers table',
    up(db) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS mcp_servers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'custom',
            transport TEXT NOT NULL DEFAULT 'stdio',
            command TEXT,
            args TEXT,
            url TEXT,
            compatible_providers TEXT NOT NULL DEFAULT '"all"',
            fallback_mode TEXT NOT NULL DEFAULT 'disabled',
            config_schema TEXT,
            user_config TEXT,
            env_vars TEXT,
            is_installed INTEGER NOT NULL DEFAULT 0,
            install_method TEXT DEFAULT 'builtin',
            install_command TEXT,
            source TEXT NOT NULL DEFAULT 'custom',
            registry_url TEXT,
            version TEXT,
            is_global_enabled INTEGER NOT NULL DEFAULT 1,
            enabled_for_providers TEXT,
            tags TEXT,
            author TEXT,
            homepage TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `)
      } catch (err) {
        console.error('[Database] Failed to create mcp_servers table:', err)
      }
    },
  },

  // ── v21: chat_task_sessions 表 ──
  {
    version: 21,
    description: 'create chat_task_sessions table',
    up(db) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS chat_task_sessions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id    TEXT NOT NULL,
            platform   TEXT NOT NULL,
            session_id TEXT NOT NULL,
            session_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_chat_task_sessions_chat
            ON chat_task_sessions(chat_id, platform, created_at DESC);
        `)
      } catch (err) {
        console.error('[Database] Failed to create chat_task_sessions table:', err)
      }
    },
  },

  // ── v23: skills 表 ──
  {
    version: 23,
    description: 'create skills table',
    up(db) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS skills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'general',
            slash_command TEXT,
            type TEXT NOT NULL DEFAULT 'prompt',
            compatible_providers TEXT NOT NULL DEFAULT '"all"',
            prompt_template TEXT,
            system_prompt_addition TEXT,
            input_variables TEXT,
            native_config TEXT,
            required_mcps TEXT,
            is_installed INTEGER NOT NULL DEFAULT 1,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            source TEXT NOT NULL DEFAULT 'custom',
            version TEXT,
            author TEXT,
            tags TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `)
      } catch (err) {
        console.error('[Database] Failed to create skills table:', err)
      }
    },
  },

  // ── v28: conversation_messages 添加 file_change 列 ──
  {
    version: 28,
    description: 'add file_change column to conversation_messages',
    up(db) {
      addColumnIfNotExists(db, 'conversation_messages', 'file_change', 'TEXT')
    },
  },

  // ── v29: mcp_servers 增加 headers 列（http/sse 模式的自定义请求头） ──
  {
    version: 29,
    description: 'add headers column to mcp_servers',
    up(db) {
      addColumnIfNotExists(db, 'mcp_servers', 'headers', 'TEXT')
    },
  },

  // ── v30: skills 增加 orchestration_config 列（兼容新 SkillRepository 字段） ──
  {
    version: 30,
    description: 'add orchestration_config column to skills',
    up(db) {
      addColumnIfNotExists(db, 'skills', 'orchestration_config', 'TEXT')
    },
  },

  // ── v31: 修复历史库缺列（attachments / session summary v2 字段） ──
  {
    version: 31,
    description: 'backfill missing columns for conversation_messages and session_summaries',
    up(db) {
      if (tableExists(db, 'conversation_messages')) {
        addColumnIfNotExists(db, 'conversation_messages', 'attachments', 'TEXT')
      }
      if (tableExists(db, 'session_summaries')) {
        addColumnIfNotExists(db, 'session_summaries', 'type', "TEXT NOT NULL DEFAULT 'summary'")
        addColumnIfNotExists(db, 'session_summaries', 'content', 'TEXT')
        addColumnIfNotExists(db, 'session_summaries', 'metadata', 'TEXT')
      }
    },
  },

  // ── v32: 规范 conversation_messages.id 为 TEXT（兼容字符串 message id/uuid） ──
  {
    version: 32,
    description: 'normalize conversation_messages.id to TEXT primary key',
    up(db) {
      if (!tableExists(db, 'conversation_messages')) return

      const cols = getColumnNames(db, 'conversation_messages')
      const info = db.prepare("PRAGMA table_info('conversation_messages')").all() as any[]
      const idCol = info.find((c: any) => c.name === 'id')
      const idType = String(idCol?.type || '').toUpperCase()

      // 已是 TEXT 主键则仅补齐缺列
      if (idType.includes('TEXT')) {
        addColumnIfNotExists(db, 'conversation_messages', 'attachments', 'TEXT')
        addColumnIfNotExists(db, 'conversation_messages', 'file_change', 'TEXT')
        addColumnIfNotExists(db, 'conversation_messages', 'message_id', 'TEXT')
        return
      }

      const tx = db.transaction(() => {
        db.exec('ALTER TABLE conversation_messages RENAME TO conversation_messages_legacy_v32')

        db.exec(`
          CREATE TABLE conversation_messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'text',
            content TEXT,
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            attachments TEXT,
            tool_name TEXT,
            tool_input TEXT,
            tool_result TEXT,
            is_error INTEGER NOT NULL DEFAULT 0,
            thinking_text TEXT,
            usage_input_tokens INTEGER,
            usage_output_tokens INTEGER,
            tool_use_id TEXT,
            file_change TEXT,
            message_id TEXT
          )
        `)

        const idExpr = cols.includes('message_id')
          ? "COALESCE(NULLIF(CAST(message_id AS TEXT), ''), CAST(id AS TEXT))"
          : 'CAST(id AS TEXT)'
        const typeExpr = cols.includes('type') ? "COALESCE(type, 'text')" : "'text'"
        const attachmentsExpr = cols.includes('attachments') ? 'attachments' : 'NULL'
        const toolNameExpr = cols.includes('tool_name') ? 'tool_name' : 'NULL'
        const toolInputExpr = cols.includes('tool_input') ? 'tool_input' : 'NULL'
        const toolResultExpr = cols.includes('tool_result') ? 'tool_result' : 'NULL'
        const isErrorExpr = cols.includes('is_error') ? 'COALESCE(is_error, 0)' : '0'
        const thinkingExpr = cols.includes('thinking_text') ? 'thinking_text' : 'NULL'
        const inTokExpr = cols.includes('usage_input_tokens') ? 'usage_input_tokens' : 'NULL'
        const outTokExpr = cols.includes('usage_output_tokens') ? 'usage_output_tokens' : 'NULL'
        const toolUseIdExpr = cols.includes('tool_use_id') ? 'tool_use_id' : 'NULL'
        const fileChangeExpr = cols.includes('file_change') ? 'file_change' : 'NULL'
        const messageIdExpr = cols.includes('message_id') ? 'message_id' : 'NULL'

        db.exec(`
          INSERT OR IGNORE INTO conversation_messages (
            id, session_id, role, type, content, timestamp, attachments,
            tool_name, tool_input, tool_result, is_error, thinking_text,
            usage_input_tokens, usage_output_tokens, tool_use_id, file_change, message_id
          )
          SELECT
            ${idExpr},
            session_id,
            role,
            ${typeExpr},
            content,
            timestamp,
            ${attachmentsExpr},
            ${toolNameExpr},
            ${toolInputExpr},
            ${toolResultExpr},
            ${isErrorExpr},
            ${thinkingExpr},
            ${inTokExpr},
            ${outTokExpr},
            ${toolUseIdExpr},
            ${fileChangeExpr},
            ${messageIdExpr}
          FROM conversation_messages_legacy_v32
        `)

        db.exec('DROP TABLE conversation_messages_legacy_v32')
        db.exec('CREATE INDEX IF NOT EXISTS idx_conv_messages_session ON conversation_messages(session_id, timestamp)')
      })

      tx()
    },
  },
  {
    version: 33,
    description: 'create team workflow tables',
    up(db: any) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS team_workflows (
          workflow_id TEXT PRIMARY KEY,
          session_id  TEXT NOT NULL,
          goal        TEXT NOT NULL,
          phase       TEXT NOT NULL DEFAULT 'brainstorming',
          approved    INTEGER NOT NULL DEFAULT 0,
          plan_content TEXT,
          version     INTEGER NOT NULL DEFAULT 0,
          created_at  TEXT NOT NULL,
          updated_at  TEXT NOT NULL
        )
      `)
      db.exec(`
        CREATE TABLE IF NOT EXISTS team_workflow_steps (
          step_id     TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          title       TEXT NOT NULL,
          owner_role  TEXT,
          status      TEXT NOT NULL DEFAULT 'pending',
          depends_on  TEXT,
          evidence    TEXT,
          created_at  TEXT NOT NULL,
          updated_at  TEXT NOT NULL,
          FOREIGN KEY (workflow_id) REFERENCES team_workflows(workflow_id)
        )
      `)
      db.exec(`
        CREATE TABLE IF NOT EXISTS team_workflow_events (
          event_id    TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          type        TEXT NOT NULL,
          payload     TEXT,
          created_at  TEXT NOT NULL,
          FOREIGN KEY (workflow_id) REFERENCES team_workflows(workflow_id)
        )
      `)
      db.exec('CREATE INDEX IF NOT EXISTS idx_team_workflows_session ON team_workflows(session_id)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_team_workflow_steps_workflow ON team_workflow_steps(workflow_id)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_team_workflow_events_workflow ON team_workflow_events(workflow_id)')
    },
  },

  // ── v34: team agent 表 ──
  {
    version: 34,
    description: 'create team_templates, team_instances, team_instance_members, team_messages tables',
    up(db: any) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS team_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          members TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      db.exec(`
        CREATE TABLE IF NOT EXISTS team_instances (
          id TEXT PRIMARY KEY,
          template_id TEXT NOT NULL,
          name TEXT NOT NULL,
          working_directory TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'idle',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT
        )
      `)
      db.exec(`
        CREATE TABLE IF NOT EXISTS team_instance_members (
          id TEXT PRIMARY KEY,
          team_instance_id TEXT NOT NULL,
          role TEXT NOT NULL,
          name TEXT NOT NULL,
          system_prompt TEXT DEFAULT '',
          provider_id TEXT NOT NULL DEFAULT 'claude-code',
          mode TEXT NOT NULL DEFAULT 'member',
          status TEXT NOT NULL DEFAULT 'idle',
          agent_id TEXT,
          session_id TEXT,
          current_task TEXT,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (team_instance_id) REFERENCES team_instances(id) ON DELETE CASCADE
        )
      `)
      db.exec(`
        CREATE TABLE IF NOT EXISTS team_messages (
          id TEXT PRIMARY KEY,
          team_instance_id TEXT NOT NULL,
          role TEXT NOT NULL,
          member_name TEXT,
          member_role TEXT,
          content TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          FOREIGN KEY (team_instance_id) REFERENCES team_instances(id) ON DELETE CASCADE
        )
      `)
      db.exec('CREATE INDEX IF NOT EXISTS idx_team_instance_members_instance ON team_instance_members(team_instance_id)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_team_messages_instance ON team_messages(team_instance_id, timestamp)')
    },
  },
]
