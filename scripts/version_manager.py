#!/usr/bin/env python3
"""Version Manager - Centralized version control for SafeReturn.

This script ensures all version references are synchronized across the project.
Run: python scripts/version_manager.py [bump|major|minor|patch|set X.Y.Z]

Usage:
    python scripts/version_manager.py          # Show current version
    python scripts/version_manager.py bump    # Bump to next version (1.0.2 -> 1.0.3)
    python scripts/version_manager.py set 2.0.0 # Set specific version
"""

import json
import re
import sys
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
VERSION_FILE = PROJECT_ROOT / "version.json"

# Files that need version updates (VERSION placeholder will be replaced)
VERSION_FILES = {
    "frontend/package.json": [
        ('"version":', '"version":')  # Placeholder, actual version handled specially
    ],
    "frontend/src-tauri/Cargo.toml": [
        (r'version\s*=\s*"[^"]*"', 'version = "VERSION"')
    ],
    "frontend/src/lib/i18n/en.json": [
        (
            r'"subtitle":\s*"SafeReturn v[^"]+"',
            '"subtitle": "SafeReturn vVERSION — Hospital Readmission Prediction"',
        )
    ],
    "frontend/src/lib/i18n/es.json": [
        (
            r'"subtitle":\s*"SafeReturn v[^"]+"',
            '"subtitle": "SafeReturn vVERSION — Predicción de Readmisión Hospitalaria"',
        )
    ],
    "CHANGELOG.md": [
        # Don't automatically update CHANGELOG - it's manual
        # Only check that it exists
    ],
}


def load_version():
    """Load current version from version.json"""
    if VERSION_FILE.exists():
        with open(VERSION_FILE, "r") as f:
            data = json.load(f)
            return data.get("version", "0.0.0")
    return None


def save_version(version: str):
    """Save version to version.json"""
    data = {
        "version": version,
        "name": "SafeReturn",
        "description": "Hospital Readmission Prediction System",
    }
    with open(VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"[OK] version.json updated to {version}")


def parse_version(version: str):
    """Parse version string into tuple of integers"""
    parts = version.split(".")
    return tuple(int(p) for p in parts)


def bump_version(current: str, bump_type: str = "patch") -> str:
    """Bump version number"""
    major, minor, patch = parse_version(current)

    if bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    elif bump_type == "minor":
        minor += 1
        patch = 0
    else:  # patch
        patch += 1

    return f"{major}.{minor}.{patch}"


def update_file(file_path: str, replacements: list, version: str):
    """Update version references in a file"""
    path = PROJECT_ROOT / file_path

    if not path.exists():
        print(f"  ⚠ File not found: {file_path}")
        return False

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Special handling for package.json
    if file_path == "frontend/package.json":
        content = re.sub(r'"version":\s*"[^"]+"', f'"version": "{version}"', content)
    else:
        for pattern, replacement in replacements:
            content = re.sub(pattern, replacement.replace("VERSION", version), content)

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  [OK] Updated: {file_path}")
        return True

    print(f"  [--] No changes: {file_path}")
    return False


def show_current_version():
    """Display current version info"""
    version = load_version()

    if version:
        print(f"\n[*] SafeReturn v{version}")
        print(f"    Location: {VERSION_FILE}")
    else:
        print("[!] No version.json found!")
        sys.exit(1)

    # Check if all files are synchronized
    print("\n[*] Checking synchronization...")
    all_synced = True

    for file_path in VERSION_FILES:
        path = PROJECT_ROOT / file_path
        if not path.exists():
            print(f"  [!] Missing: {file_path}")
            all_synced = False
            continue

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        if f"v{version}" in content or version in content:
            print(f"  [OK] {file_path}")
        else:
            print(f"  [X] {file_path} - OUT OF SYNC")
            all_synced = False

    if all_synced:
        print("\n[OK] All files synchronized!")
    else:
        print(
            "\n[!] Some files are out of sync. Run 'python scripts/version_manager.py bump' to fix."
        )

    return all_synced


def main():
    if len(sys.argv) < 2:
        show_current_version()
        return

    command = sys.argv[1].lower()

    if command in ["major", "minor", "patch"]:
        # Bump version
        current = load_version()
        if not current:
            print("⚠ No version.json found!")
            sys.exit(1)

        new_version = bump_version(current, command)
        save_version(new_version)

    elif command == "bump":
        # Default bump is patch
        current = load_version()
        if not current:
            print("[!] No version.json found!")
            sys.exit(1)

        new_version = bump_version(current, "patch")
        save_version(new_version)

    elif command == "set" and len(sys.argv) >= 3:
        # Set specific version
        new_version = sys.argv[2]
        save_version(new_version)

    elif command == "sync":
        # Synchronize all files
        version = load_version()
        if not version:
            print("⚠ No version.json found!")
            sys.exit(1)

    else:
        print(__doc__)
        return

    # Get the version to apply
    version = load_version()
    print(f"\n[*] Applying v{version} to all files...\n")

    # Update all files
    updated_count = 0
    for file_path, replacements in VERSION_FILES.items():
        if update_file(file_path, replacements, version):
            updated_count += 1

    print(f"\n[OK] Version {version} applied to {updated_count} files!")
    print("\n[*] Next steps:")
    print("    1. Review changes with git diff")
    print(f"    2. Commit: git add -A && git commit -m 'release: v{version}'")
    print(f"    3. Tag: git tag v{version}")


if __name__ == "__main__":
    main()
