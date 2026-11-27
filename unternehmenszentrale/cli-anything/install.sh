#!/usr/bin/env bash
set -euo pipefail

source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="$source_dir/enterprise_cli.py"
prefix="${1:-$HOME/.local}"
bin_dir="$prefix/bin"
link="$bin_dir/uz-cli"

test -f "$target"
python3 -V >/dev/null
mkdir -p "$bin_dir"
wrapper="$(printf '#!/usr/bin/env bash\nexec python3 %q "$@"\n' "$target")"
if [[ -e "$link" || -L "$link" ]]; then
  if [[ "$(cat "$link")" == "$wrapper" ]]; then
    echo "Bereits installiert: $link"
    exit 0
  fi
  echo "Anderes Programm vorhanden: $link" >&2
  exit 1
fi
printf '%s\n' "$wrapper" > "$link"
chmod 755 "$link"
echo "Installiert: $link"
