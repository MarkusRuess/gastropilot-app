import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("enterprise_cli", HERE / "enterprise_cli.py")
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)


class EnterpriseCLI(unittest.TestCase):
    def test_project_allowlist_blocks_commands_and_path_traversal(self):
        with self.assertRaises(ValueError):
            cli.run("../judith")
        with self.assertRaises(ValueError):
            cli.run("judith; curl example.com")

    def test_missing_test_is_rejected_before_process_start(self):
        with tempfile.TemporaryDirectory() as root:
            with patch.object(cli.subprocess, "run") as process:
                with self.assertRaises(RuntimeError):
                    cli.run("judith", root=root)
                process.assert_not_called()

    def test_child_process_does_not_inherit_credentials(self):
        with patch.dict(os.environ, {"GH_TOKEN": "synthetic-token"}):
            with patch.object(cli.subprocess, "run") as process:
                process.return_value.returncode = 0
                process.return_value.stdout = ""
                process.return_value.stderr = ""
                cli.run("zentrale")
                self.assertNotIn("GH_TOKEN", process.call_args.kwargs["env"])

    def test_list_and_invalid_project(self):
        result = subprocess.run(
            ["python3", str(HERE / "enterprise_cli.py"), "--json", "list"],
            capture_output=True, text=True, check=True,
        )
        self.assertEqual(json.loads(result.stdout)["projects"],
                         ["zentrale", "judith", "friedrich"])
        invalid = subprocess.run(
            ["python3", str(HERE / "enterprise_cli.py"), "check",
             "--project", "../judith"], capture_output=True, text=True,
        )
        self.assertNotEqual(invalid.returncode, 0)

    def test_three_real_project_checks(self):
        for project in cli.PROJECTS:
            with self.subTest(project=project):
                result = cli.run(project)
                self.assertTrue(result["passed"], result["output"] + result["error"])
                self.assertIn("pass ", result["output"])


if __name__ == "__main__":
    unittest.main()
