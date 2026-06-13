with open("src/components/ExerciseAnimator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Find occurrences of "else if" after index 53000
running_idx = content.find("name.includes(\"running\")")
if running_idx != -1:
    print("Found running block. Searching for subsequent else if blocks:")
    sub_content = content[running_idx:]
    matches = list(re.finditer(r"else\s+if\s*\(([^)]+)\)", sub_content))
    for m in matches:
        print("  Condition:", m.group(1).strip())
else:
    print("Could not find running block index")
