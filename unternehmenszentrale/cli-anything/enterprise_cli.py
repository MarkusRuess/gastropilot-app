#!/usr/bin/env python3
"""Offline, allowlisted enterprise verification harness."""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
PROJECTS = {
    "zentrale": ("unternehmenszentrale/reuse.test.mjs",),
    "judith": ("scripts/test-judith-backlist.mjs",),
    "friedrich": ("scripts/test-friedrich-stock.mjs",),
}


def run(project, node="node", root=ROOT):
    if project not in PROJECTS:
        raise ValueError("Unknown project")
    root = Path(root).resolve()
    files = PROJECTS[project]
    for name in files:
        path = (root / name).resolve()
        if not path.is_file() or not path.is_relative_to(root):
            raise RuntimeError("Approved test file missing or outside repository")
    # The child receives no account credentials or tokens. No shell or network
    # configuration is supplied; test paths are a fixed allowlist.
    with tempfile.TemporaryDirectory(prefix="enterprise-cli-") as home:
        env = {"PATH": os.environ.get("PATH", ""), "HOME": home, "CI": "true"}
        result = subprocess.run(
            [node, "--test", *files],
            cwd=root, env=env, capture_output=True, text=True, timeout=120,
            check=False,
        )
    return {
        "project": project,
        "passed": result.returncode == 0,
        "exit_code": result.returncode,
        "output": result.stdout[-12000:],
        "error": result.stderr[-2000:],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Kostenfreie Projektprüfungen")
    parser.add_argument("--json", action="store_true", help="Maschinenlesbare Ausgabe")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list", help="Zugelassene Projekte")
    check = sub.add_parser("check", help="Synthetische lokale Tests ausführen")
    check.add_argument("--project", required=True, choices=PROJECTS)
    args = parser.parse_args(argv)
    if args.command == "list":
        value = {"projects": list(PROJECTS)}
    else:
        try:
            value = run(args.project)
        except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
            value = {"project": args.project, "passed": False,
                     "error": type(exc).__name__}
    if args.json:
        print(json.dumps(value, ensure_ascii=False))
    elif args.command == "list":
        print("\n".join(value["projects"]))
    else:
        print(value.get("output", ""), end="")
        if not value["passed"]:
            print(f"Prüfung fehlgeschlagen: {value.get('error', 'Testfehler')}",
                  file=sys.stderr)
    return 0 if args.command == "list" or value["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
