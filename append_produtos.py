import sys

source = '/Users/larrat/Sites/sistema_comercial/src/react/features/pedidos/services/produtosApi.ts'
dest = '/Users/larrat/Sites/sistema_comercial/src/react/features/produtos/services/produtosApi.ts'

with open(source, 'r') as f:
    lines = f.readlines()

# Extract from line 58 (buildProdutoSearchSelect) to the end, plus PdvProdutoSearchResult at top
pdv_type = "".join(lines[3:18]) # Lines 4 to 18 in 1-based index
pdv_methods = "".join(lines[58:]) # Lines 59 to 164

with open(dest, 'a') as f:
    f.write("\n" + pdv_type + "\n" + pdv_methods)

print("Appended successfully.")
