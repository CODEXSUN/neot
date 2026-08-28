#![windows_subsystem = "windows"]

use std::ffi::OsStr;
use std::fs::{create_dir, remove_dir, remove_file, OpenOptions};
use std::io::{self, Write};
use std::os::windows::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use std::process::{self, Command};
use std::time::{SystemTime, UNIX_EPOCH};

const INSTALLER_BYTES: &[u8] = include_bytes!(env!("NEOT_MSI_PATH"));
const VERSION: &str = env!("NEOT_VERSION");

fn main() {
    if let Err(error) = install() {
        show_error(&error.to_string());
        process::exit(1);
    }
}

fn install() -> io::Result<()> {
    let directory = create_installer_directory()?;
    let installer = directory.join(format!("NEOT_{VERSION}_x64_en-US.msi"));

    write_installer(&installer)?;
    let status = Command::new("msiexec.exe")
        .arg("/i")
        .arg(&installer)
        .arg("/passive")
        .arg("/norestart")
        .status();

    let cleanup_result = cleanup(&installer, &directory);
    let status = status?;
    cleanup_result?;

    match status.code() {
        Some(0 | 1641 | 3010) => Ok(()),
        Some(code) => Err(io::Error::other(format!(
            "Windows Installer stopped with error code {code}."
        ))),
        None => Err(io::Error::other(
            "Windows Installer stopped without a result.",
        )),
    }
}

fn create_installer_directory() -> io::Result<PathBuf> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(io::Error::other)?
        .as_nanos();
    let directory = std::env::temp_dir().join(format!(
        "NEOT-setup-{VERSION}-{}-{timestamp}",
        process::id()
    ));
    create_dir(&directory)?;
    Ok(directory)
}

fn write_installer(path: &Path) -> io::Result<()> {
    let mut file = OpenOptions::new().write(true).create_new(true).open(path)?;
    file.write_all(INSTALLER_BYTES)?;
    file.sync_all()
}

fn cleanup(installer: &Path, directory: &Path) -> io::Result<()> {
    remove_file(installer)?;
    remove_dir(directory)
}

fn show_error(message: &str) {
    let message = wide(message);
    let title = wide("NEOT Setup");
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            message.as_ptr(),
            title.as_ptr(),
            0x0000_0010,
        );
    }
}

fn wide(value: &str) -> Vec<u16> {
    OsStr::new(value).encode_wide().chain(Some(0)).collect()
}

#[link(name = "user32")]
extern "system" {
    fn MessageBoxW(
        window: *mut std::ffi::c_void,
        text: *const u16,
        caption: *const u16,
        kind: u32,
    ) -> i32;
}
