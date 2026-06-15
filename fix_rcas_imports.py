import os

directory = '/Users/larrat/Sites/sistema_comercial/src/react/features/pedidos'

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content.replace("from '../services/rcasApi'", "from '../../rcas/services/rcasApi'")
            new_content = new_content.replace("from '../../services/rcasApi'", "from '../../../rcas/services/rcasApi'")
            new_content = new_content.replace("from './rcasApi'", "from '../../rcas/services/rcasApi'")

            if new_content != content:
                print(f"Updated {path}")
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
