use rusqlite::{params, OptionalExtension, Row};
use serde::Serialize;

use crate::error::{DesktopError, DesktopResult};

use super::DesktopDatabase;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectLearningSettings {
    pub enabled: bool,
    pub auto_scan: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectLearning {
    pub id: i64,
    pub category: String,
    pub title: String,
    pub content: String,
    pub evidence_path: Option<String>,
    pub source: String,
    pub status: String,
    pub confidence: i64,
    pub is_current: bool,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectLearningSummary {
    pub settings: ProjectLearningSettings,
    pub items: Vec<ProjectLearning>,
    pub approved_count: usize,
    pub candidate_count: usize,
    pub stale_count: usize,
}

pub struct DetectedLearning<'a> {
    pub fingerprint: &'a str,
    pub category: &'a str,
    pub title: &'a str,
    pub content: &'a str,
    pub evidence_path: Option<&'a str>,
    pub confidence: i64,
}

impl DesktopDatabase {
    pub fn project_learning_summary(
        &self,
        workspace_path: &str,
    ) -> DesktopResult<ProjectLearningSummary> {
        let settings = self.project_learning_settings(workspace_path)?;
        let mut statement = self.connection.prepare(
            "SELECT id, category, title, content, evidence_path, source, status,
                    confidence, is_current, updated_at
             FROM desktop_project_learnings
             WHERE workspace_path = ?1
             ORDER BY
               CASE status WHEN 'candidate' THEN 0 WHEN 'approved' THEN 1
                 WHEN 'stale' THEN 2 ELSE 3 END,
               updated_at DESC, id DESC",
        )?;
        let rows = statement.query_map(params![workspace_path], project_learning_from_row)?;
        let items = rows.collect::<Result<Vec<_>, _>>()?;
        Ok(ProjectLearningSummary {
            approved_count: count_status(&items, "approved"),
            candidate_count: count_status(&items, "candidate"),
            stale_count: count_status(&items, "stale"),
            settings,
            items,
        })
    }

    pub fn save_project_learning_settings(
        &self,
        workspace_path: &str,
        enabled: bool,
        auto_scan: bool,
    ) -> DesktopResult<ProjectLearningSettings> {
        self.connection.execute(
            "INSERT INTO desktop_project_learning_settings (workspace_path, enabled, auto_scan)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(workspace_path) DO UPDATE SET
               enabled = excluded.enabled,
               auto_scan = excluded.auto_scan,
               updated_at = CURRENT_TIMESTAMP",
            params![workspace_path, enabled, auto_scan],
        )?;
        Ok(ProjectLearningSettings { enabled, auto_scan })
    }

    pub fn replace_detected_learnings(
        &mut self,
        workspace_path: &str,
        learnings: &[DetectedLearning<'_>],
    ) -> DesktopResult<()> {
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "UPDATE desktop_project_learnings SET is_current = 0
             WHERE workspace_path = ?1 AND source = 'detected'",
            params![workspace_path],
        )?;
        for learning in learnings {
            transaction.execute(
                "INSERT INTO desktop_project_learnings (
                   workspace_path, fingerprint, category, title, content, evidence_path,
                   source, status, confidence, is_current
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'detected', 'candidate', ?7, 1)
                 ON CONFLICT(workspace_path, fingerprint) DO UPDATE SET
                   category = excluded.category,
                   title = excluded.title,
                   status = CASE
                     WHEN desktop_project_learnings.content <> excluded.content THEN 'candidate'
                     ELSE desktop_project_learnings.status
                   END,
                   content = excluded.content,
                   evidence_path = excluded.evidence_path,
                   confidence = excluded.confidence,
                   is_current = 1,
                   updated_at = CURRENT_TIMESTAMP,
                   last_verified_at = CURRENT_TIMESTAMP",
                params![
                    workspace_path,
                    learning.fingerprint,
                    learning.category,
                    learning.title,
                    learning.content,
                    learning.evidence_path,
                    learning.confidence
                ],
            )?;
        }
        transaction.execute(
            "UPDATE desktop_project_learnings
             SET status = 'stale', updated_at = CURRENT_TIMESTAMP
             WHERE workspace_path = ?1 AND source = 'detected' AND is_current = 0
               AND status IN ('candidate', 'approved')",
            params![workspace_path],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn review_project_learning(
        &self,
        workspace_path: &str,
        id: i64,
        status: &str,
    ) -> DesktopResult<ProjectLearning> {
        if !["approved", "rejected"].contains(&status) {
            return Err(DesktopError::Policy(
                "A learning review must approve or reject the item.".into(),
            ));
        }
        let changed = self.connection.execute(
            "UPDATE desktop_project_learnings
             SET status = ?1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2 AND workspace_path = ?3 AND is_current = 1",
            params![status, id, workspace_path],
        )?;
        if changed == 0 {
            return Err(DesktopError::Policy(
                "The project learning item is missing or stale.".into(),
            ));
        }
        self.connection
            .query_row(
                "SELECT id, category, title, content, evidence_path, source, status,
                        confidence, is_current, updated_at
                 FROM desktop_project_learnings WHERE id = ?1",
                params![id],
                project_learning_from_row,
            )
            .map_err(Into::into)
    }

    pub fn approved_project_learning_context(
        &self,
        workspace_path: &str,
    ) -> DesktopResult<Vec<ProjectLearning>> {
        if !self.project_learning_settings(workspace_path)?.enabled {
            return Ok(Vec::new());
        }
        let mut statement = self.connection.prepare(
            "SELECT id, category, title, content, evidence_path, source, status,
                    confidence, is_current, updated_at
             FROM desktop_project_learnings
             WHERE workspace_path = ?1 AND status = 'approved' AND is_current = 1
             ORDER BY category, title LIMIT 40",
        )?;
        let rows = statement.query_map(params![workspace_path], project_learning_from_row)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    fn project_learning_settings(
        &self,
        workspace_path: &str,
    ) -> DesktopResult<ProjectLearningSettings> {
        let saved = self
            .connection
            .query_row(
                "SELECT enabled, auto_scan FROM desktop_project_learning_settings
                 WHERE workspace_path = ?1",
                params![workspace_path],
                |row| {
                    Ok(ProjectLearningSettings {
                        enabled: row.get(0)?,
                        auto_scan: row.get(1)?,
                    })
                },
            )
            .optional()?;
        Ok(saved.unwrap_or(ProjectLearningSettings {
            enabled: true,
            auto_scan: true,
        }))
    }
}

fn project_learning_from_row(row: &Row<'_>) -> rusqlite::Result<ProjectLearning> {
    Ok(ProjectLearning {
        id: row.get(0)?,
        category: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        evidence_path: row.get(4)?,
        source: row.get(5)?,
        status: row.get(6)?,
        confidence: row.get(7)?,
        is_current: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

fn count_status(items: &[ProjectLearning], status: &str) -> usize {
    items.iter().filter(|item| item.status == status).count()
}
