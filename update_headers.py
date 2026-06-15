import os
import re

directory = '/Users/larrat/Sites/sistema_comercial/src/react/features'
pattern = re.compile(r'actions=\{\s*<div className="flex (?:items-center )?gap-\d+"(>.*?)', re.DOTALL)

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Simple heuristic: find PageHeader actions
            # We want to replace <div className="flex items-center gap-3">
            # only if it's right after actions={
            
            def replacer(match):
                rest = match.group(1)
                return 'actions={\n          <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-6 mt-4 lg:mt-0 w-full lg:w-auto"' + rest

            new_content = pattern.sub(replacer, content)
            
            if new_content != content:
                print(f"Updated {path}")
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
