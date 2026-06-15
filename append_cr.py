import sys

source = '/Users/larrat/Sites/sistema_comercial/src/react/features/pedidos/services/contasReceberApi.ts'
dest = '/Users/larrat/Sites/sistema_comercial/src/react/features/contas-receber/services/contasReceberApi.ts'

with open(source, 'r') as f:
    lines = f.readlines()

# Assuming line 5 starts PRAZO_DIAS and it goes all the way to the end.
# We skip the imports at the top
content_to_append = "".join(lines[4:])

with open(dest, 'a') as f:
    f.write("\n" + content_to_append)

print("Appended CR methods successfully.")
