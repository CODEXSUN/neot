use thiserror::Error;

#[derive(Debug, Error)]
pub enum DesktopError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("File operation failed: {0}")]
    Io(#[from] std::io::Error),
    #[error("Network request failed: {0}")]
    Network(#[from] reqwest::Error),
    #[error("{0}")]
    Policy(String),
}

impl serde::Serialize for DesktopError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type DesktopResult<T> = Result<T, DesktopError>;
