import re

file_path = '/Users/larrat/Sites/sistema_comercial/src/react/features/produtos/services/produtosApi.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Replace PedidoApiContext with ProdutoApiContext in the appended portion
content = content.replace('PedidoApiContext', 'ProdutoApiContext')

# Replace createHeaders(context) with createHeaders(context.key, context.token) in the appended portion
content = content.replace('createHeaders(context)', 'createHeaders(context.key, context.token)')

with open(file_path, 'w') as f:
    f.write(content)

print("Fixed appended methods in produtosApi.ts")
