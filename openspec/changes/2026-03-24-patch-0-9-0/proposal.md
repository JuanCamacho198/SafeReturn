# Proposal: Patch 0.9.0 - Branding and Build Fixes

## Intent
Rename the application to "SafeReturn", perform a global version bump to 0.9.0, and resolve a critical Tauri build error related to a missing sidecar.

## Scope
- Update `package.json` in root, `frontend`, and `backend`.
- Update Tauri configuration in `src-tauri/tauri.conf.json`.
- Fix sidecar definitions in `tauri.conf.json`.
- Update UI references to the new name "SafeReturn".

## Approach
1. **Renaming**: Search and replace all instances of the old name with "SafeReturn".
2. **Versioning**: Synchronize all project manifests to 0.9.0.
3. **Build Fix**: Ensure the sidecar executable is correctly referenced and present in the expected binary path for Tauri.
