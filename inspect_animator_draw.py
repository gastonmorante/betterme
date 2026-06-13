with open("src/components/ExerciseAnimator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = list(re.finditer(r"name\.includes", content))
print(f"Found {len(matches)} matches of name.includes in ExerciseAnimator.tsx")

for i, m in enumerate(matches):
    start = max(0, m.start() - 100)
    end = min(len(content), m.end() + 250)
    print(f"Match {i+1} at index {m.start()}:")
    print(content[start:end])
    print("-" * 50)
