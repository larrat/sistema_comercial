import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const FEATURES_DIR = path.join(ROOT_DIR, 'src', 'react', 'features');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function writeFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content.trim() + '\n', 'utf8');
    console.log(`✅ Created: ${path.relative(ROOT_DIR, filePath)}`);
  } catch (err) {
    console.error(`❌ Failed to create: ${filePath}`, err);
  }
}

async function run() {
  console.log('\n🚀 --- Antigravity Module Generator ---\n');
  
  let moduleName = process.argv[2];
  if (!moduleName) {
    moduleName = await question('Nome do módulo (ex: fornecedores, rh, veiculos): ');
  }
  
  if (!moduleName) {
    console.error('Nome do módulo é obrigatório!');
    process.exit(1);
  }

  // format string to lowercase kebab-case
  const folderName = moduleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const moduleDir = path.join(FEATURES_DIR, folderName);

  // Capitalize properly
  const NamePascal = folderName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const NameCamel = NamePascal.charAt(0).toLowerCase() + NamePascal.slice(1);

  console.log(`\nGerando módulo '${folderName}' (${NamePascal}) em src/react/features/${folderName}...\n`);

  await createDir(moduleDir);
  await createDir(path.join(moduleDir, 'components'));
  await createDir(path.join(moduleDir, 'pages'));
  await createDir(path.join(moduleDir, 'hooks'));
  await createDir(path.join(moduleDir, 'services'));

  // 1. API Service
  const apiCode = `
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { fetchWithAuth, ensureOk } from '../../../shared/hooks/apiClient';

export type ${NamePascal}Context = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

export type ${NamePascal}Item = {
  id: string;
  filial_id: string;
  criado_em: string;
  atualizado_em: string;
  // TODO: Add fields
};

export async function list${NamePascal}(context: ${NamePascal}Context): Promise<${NamePascal}Item[]> {
  const url = \`\${context.url}/rest/v1/${folderName.replace('-', '_')}?filial_id=eq.\${context.filialId}\`;
  const res = await fetchWithAuth(url, context, { signal: AbortSignal.timeout(10000) });
  const body = await res.json();
  ensureOk(res, body, \`Erro ao listar \${context.filialId}\`);
  return Array.isArray(body) ? body : [];
}
`;
  await writeFile(path.join(moduleDir, 'services', `${NameCamel}Api.ts`), apiCode);

  // 2. Query Hooks
  const hooksCode = `
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { list${NamePascal} } from '../services/${NameCamel}Api';
import type { ${NamePascal}Item } from '../services/${NameCamel}Api';

export function use${NamePascal}Data() {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['${folderName}', context?.filialId],
    queryFn: () => list${NamePascal}(context!),
    enabled: !!context,
    staleTime: 60 * 1000,
  });
}
`;
  await writeFile(path.join(moduleDir, 'hooks', `use${NamePascal}Data.ts`), hooksCode);

  // 3. Pilot Page
  const pageCode = `
import React from 'react';
import { use${NamePascal}Data } from '../hooks/use${NamePascal}Data';
import { LoadingState, ErrorState, Button } from '../../../shared/ui';
import { Plus } from 'lucide-react';
import { useRoleStore } from '../../auth/store/useRoleStore';

export function ${NamePascal}PilotPage() {
  const { data, isLoading, isError, error } = use${NamePascal}Data();
  const hasPermission = useRoleStore((state) => state.hasPermission);

  if (isLoading) return <LoadingState title="Carregando ${NamePascal}..." />;
  if (isError) return <ErrorState title="Erro ao carregar dados" message={error?.message} />;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">${NamePascal}</h1>
          <p className="text-slate-400 mt-1">Gerencie os registros deste módulo</p>
        </div>
        {hasPermission('admin') && (
          <Button variant="primary">
            <Plus size={16} className="mr-2" />
            Novo Registro
          </Button>
        )}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-white/5 shadow-xl p-6">
        {data?.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Nenhum registro encontrado.</div>
        ) : (
          <div className="grid gap-4">
            {data?.map((item) => (
              <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <span className="text-sm font-mono text-slate-400">{item.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
`;
  await writeFile(path.join(moduleDir, 'components', `${NamePascal}PilotPage.tsx`), pageCode);

  // 4. Route Page Wrapper
  const routePageCode = `
import React from 'react';
import { ${NamePascal}PilotPage } from '../components/${NamePascal}PilotPage';

export function ${NamePascal}RoutePage() {
  return <${NamePascal}PilotPage />;
}
`;
  await writeFile(path.join(moduleDir, 'pages', `${NamePascal}RoutePage.tsx`), routePageCode);

  console.log('\n🎉 Módulo criado com sucesso!');
  console.log(\`Não se esqueça de adicionar a rota em src/react/app/router/AppRouter.tsx:\`);
  console.log(\`\n  import { \${NamePascal}RoutePage } from '../../features/${folderName}/pages/\${NamePascal}RoutePage';\`);
  console.log(\`  <Route path="${folderName}" element={<\${NamePascal}RoutePage />} />\n\`);
  
  rl.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
