import os
import re

directory = '/Users/larrat/Sites/sistema_comercial/src/react/features'

context_pattern = re.compile(r'export type ([A-Za-z]+Context) = \{\s*url:\s*string;\s*key:\s*string;\s*token:\s*string;\s*filialId:\s*string;\s*\};', re.MULTILINE)

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('Api.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            match = context_pattern.search(content)
            if match:
                type_name = match.group(1)
                
                # Calculate relative path to src/react/shared/types/api
                # root is something like .../src/react/features/pedidos/services
                # depth from src/react is len(root.split('src/react/')[1].split('/')) 
                depth = len(root.split('src/react/')[1].split('/'))
                rel_path = '../' * depth + 'shared/types/api'
                
                replacement = f"import type {{ ApiContext }} from '{rel_path}';\nexport type {type_name} = ApiContext;"
                new_content = context_pattern.sub(replacement, content)
                
                if new_content != content:
                    print(f"Unified context in {path} ({type_name})")
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
