with open("src/components/ExerciseAnimator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = list(re.finditer(r"else\s+if\s*\(([^)]+)\)", content))
print(f"Found {len(matches)} conditions:")
for idx, m in enumerate(matches):
    print(f"  {idx+1}: {m.group(1).strip()}")
