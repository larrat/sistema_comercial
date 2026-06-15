import re

files = [
    '/Users/larrat/Sites/sistema_comercial/src/react/features/clientes/services/clientesApi.ts',
    '/Users/larrat/Sites/sistema_comercial/src/react/features/produtos/services/produtosApi.ts',
    '/Users/larrat/Sites/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the second occurrence of `function createHeaders` and replace the block
    # Actually, it's safer to just regex out the duplicated helper functions.
    # The appended code is at the bottom.
    
    # Remove from `function createHeaders` until the closing brace of `function ensureOk`
    # But only the second occurrence.
    
    pattern = re.compile(r'function createHeaders\(.*?\).*?function ensureOk\(.*?\)\s*\{.*?\}', re.DOTALL)
    
    matches = list(pattern.finditer(content))
    if len(matches) > 1:
        # We have duplicates! Let's remove all but the first one.
        for match in reversed(matches[1:]): # remove from bottom up to not mess up indices
            content = content[:match.start()] + content[match.end():]
        print(f"Fixed duplicates in {file}")
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
    
    # contasReceberApi might have used `function headers` instead of `createHeaders`
    if 'function headers(' in content:
        pattern_cr = re.compile(r'function headers\(.*?\).*?function ensureOk\(.*?\)\s*\{.*?\}', re.DOTALL)
        matches_cr = list(pattern_cr.finditer(content))
        if len(matches_cr) > 1:
            for match in reversed(matches_cr[1:]):
                content = content[:match.start()] + content[match.end():]
            print(f"Fixed duplicates in {file}")
            with open(file, 'w', encoding='utf-8') as f:
                f.write(content)

