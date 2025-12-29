import os
import glob

directory = 'tests/http/controllers'
pattern = os.path.join(directory, '*.controller.test.ts')
files = glob.glob(pattern)

import_statement = "import './setup-auth-mock'\n"

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    if "import './setup-auth-mock'" in content:
        print(f"Skipping {filepath}, already has import")
        continue

    # Insert at the very top
    new_content = import_statement + content

    with open(filepath, 'w') as f:
        f.write(new_content)

    print(f"Updated {filepath}")
