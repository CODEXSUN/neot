use std::collections::HashMap;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Child, ChildStdin};
use std::sync::Mutex;

use crate::database::DesktopDatabase;
use crate::error::{DesktopError, DesktopResult};

pub struct DesktopState {
    pub agent: Mutex<Option<AgentRuntime>>,
    database: Mutex<Option<DesktopDatabase>>,
    database_path: PathBuf,
    pub workspace: Mutex<Option<PathBuf>>,
    pub terminals: Mutex<HashMap<String, Box<dyn Write + Send>>>,
}

pub struct AgentRuntime {
    pub child: Child,
    pub executable: String,
    pub stdin: ChildStdin,
    next_id: u64,
}

impl AgentRuntime {
    pub fn new(child: Child, stdin: ChildStdin, executable: String) -> Self {
        Self {
            child,
            executable,
            stdin,
            next_id: 2,
        }
    }

    pub fn next_request_id(&mut self) -> u64 {
        let id = self.next_id;
        self.next_id += 1;
        id
    }
}

impl Drop for AgentRuntime {
    fn drop(&mut self) {
        let _ = self.child.kill();
    }
}

impl DesktopState {
    pub fn new(database_path: PathBuf) -> Self {
        Self {
            agent: Mutex::new(None),
            database: Mutex::new(None),
            database_path,
            workspace: Mutex::new(None),
            terminals: Mutex::new(HashMap::new()),
        }
    }

    pub fn with_database<T>(
        &self,
        operation: impl FnOnce(&mut DesktopDatabase) -> DesktopResult<T>,
    ) -> DesktopResult<T> {
        let mut database = self
            .database
            .lock()
            .map_err(|_| DesktopError::Policy("Desktop database is unavailable.".into()))?;
        if database.is_none() {
            *database = Some(DesktopDatabase::open(self.database_path.clone())?);
        }
        operation(database.as_mut().expect("database initialized"))
    }
}
