import sys

source = '/Users/larrat/Sites/sistema_comercial/src/react/features/pedidos/services/clientesLightApi.ts'
dest = '/Users/larrat/Sites/sistema_comercial/src/react/features/clientes/services/clientesApi.ts'

with open(source, 'r') as f:
    lines = f.readlines()

# Assuming line 4 starts the types and goes all the way
content_to_append = "".join(lines[3:])

with open(dest, 'a') as f:
    f.write("\n" + content_to_append)

print("Appended clientes light methods successfully.")
