import re

files_to_fix = {
    '/Users/larrat/Sites/sistema_comercial/src/react/features/dashboard/services/dashboardApi.ts': 'DashboardApiContext',
    '/Users/larrat/Sites/sistema_comercial/src/react/features/cotacao/types.ts': 'CotacaoApiContext'
}

pattern = re.compile(r'export type [A-Za-z]+ApiContext = \{\s*url:\s*string;\s*key:\s*string;\s*token:\s*string;\s*filialId:\s*string;\s*\};', re.MULTILINE)

for path, type_name in files_to_fix.items():
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Calculate relative path
    root = path.rsplit('/', 1)[0]
    depth = len(root.split('src/react/')[1].split('/'))
    rel_path = '../' * depth + 'shared/types/api'

    replacement = f"import type {{ ApiContext }} from '{rel_path}';\nexport type {type_name} = ApiContext;"
    
    new_content = pattern.sub(replacement, content)
    
    if new_content != content:
        print(f"Fixed {path}")
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
