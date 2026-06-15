import re

file_path = '/Users/larrat/Sites/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Fix the appended methods
content = content.replace('PedidoApiContext', 'CrApiContext')
content = content.replace('createHeaders(context)', 'headers(context.key, context.token)')

# There's also `normalizePedStatus` imported from `../types` in the duplicated file which is not in the canonical file's imports.
# I need to add `import { normalizePedStatus } from '../../pedidos/types';` at the top.
if 'normalizePedStatus' in content and 'import { normalizePedStatus' not in content:
    content = "import { normalizePedStatus } from '../../pedidos/types';\n" + content

with open(file_path, 'w') as f:
    f.write(content)

print("Fixed appended methods in contasReceberApi.ts")
