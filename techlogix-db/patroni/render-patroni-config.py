import os
import re
import yaml
import sys

def expand(value):
    if isinstance(value, dict):
        return {k: expand(v) for k, v in value.items()}

    if isinstance(value, list):
        return [expand(v) for v in value]

    if isinstance(value, str):
        return re.sub(
            r"\$\{([A-Z0-9_]+)\}",
            lambda m: os.environ[m.group(1)],
            value
        )

    return value

with open("/etc/patroni.yml.template") as f:
    config = yaml.safe_load(f)

config = expand(config)

with open("/tmp/patroni.yml", "w") as f:
    yaml.safe_dump(config, f, sort_keys=False)

os.execvp("patroni", ["patroni", "/tmp/patroni.yml"])