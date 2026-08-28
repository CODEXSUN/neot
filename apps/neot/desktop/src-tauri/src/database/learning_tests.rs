use super::{DesktopDatabase, DetectedLearning};

#[test]
fn requires_review_and_marks_missing_evidence_stale() {
    let path = std::env::temp_dir().join(format!(
        "neot-project-learning-{}.db",
        uuid::Uuid::new_v4()
    ));
    let mut database = DesktopDatabase::open(path.clone()).expect("open test database");
    let detected = [DetectedLearning {
        fingerprint: "path:src:source",
        category: "Path",
        title: "Source path",
        content: "Use src/ for source files.",
        evidence_path: Some("src"),
        confidence: 100,
    }];

    database
        .replace_detected_learnings("C:/work/neot", &detected)
        .expect("detect project fact");
    let summary = database
        .project_learning_summary("C:/work/neot")
        .expect("summarize project facts");
    assert_eq!(summary.candidate_count, 1);
    assert!(database
        .approved_project_learning_context("C:/work/neot")
        .unwrap()
        .is_empty());

    database
        .review_project_learning("C:/work/neot", summary.items[0].id, "approved")
        .expect("approve project fact");
    assert_eq!(
        database
            .approved_project_learning_context("C:/work/neot")
            .unwrap()
            .len(),
        1
    );

    database
        .replace_detected_learnings("C:/work/neot", &[])
        .expect("recheck project facts");
    let summary = database
        .project_learning_summary("C:/work/neot")
        .expect("summarize stale facts");
    assert_eq!(summary.stale_count, 1);

    let settings = database
        .save_project_learning_settings("C:/work/neot", false, false)
        .unwrap();
    assert!(!settings.enabled);
    assert!(!settings.auto_scan);

    drop(database);
    std::fs::remove_file(path).expect("remove test database");
}
