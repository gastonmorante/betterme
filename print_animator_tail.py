with open("src/components/ExerciseAnimator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

running_idx = content.find('name.includes("running")')
if running_idx != -1:
    print("Printing 1500 characters after running condition:")
    print(content[running_idx+200:running_idx+1800])
else:
    print("Could not find running block index")
