with open("src/components/ExerciseAnimator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = list(re.finditer(r"exerciseName|exercise", content, re.IGNORECASE))
print(f"Found {len(matches)} matches of exerciseName/exercise in ExerciseAnimator.tsx")

for i, m in enumerate(matches[:10]):
    start = max(0, m.start() - 60)
    end = min(len(content), m.end() + 120)
    print(f"  Match {i+1}: {repr(content[start:end])}")
