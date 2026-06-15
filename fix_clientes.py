import re

file_path = '/Users/larrat/Sites/sistema_comercial/src/react/features/clientes/services/clientesApi.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Fix the appended methods
content = content.replace('PedidoApiContext', 'ClienteApiContext')
content = content.replace('createHeaders(context)', 'createHeaders(context.key, context.token)')

with open(file_path, 'w') as f:
    f.write(content)

print("Fixed appended methods in clientesApi.ts")
