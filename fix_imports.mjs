import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFiles = [
  "src/react/features/compras/components/ComprasPilotPage.tsx",
  "src/react/features/compras/components/PedidoCompraForm.tsx",
  "src/react/features/compras/pages/PedidoCompraCreateRoutePage.tsx",
  "src/react/features/portal/pages/PortalStorefrontPage.tsx",
  "src/react/features/caixa/components/CaixaPilotPage.tsx",
  "src/react/features/dashboard/components/DashboardPilotPage.tsx",
  "src/react/features/dashboard/hooks/useGlobalAlerts.ts",
  "src/react/features/relatorios/components/OportunidadesTab.tsx",
  "src/react/features/relatorios/components/ValidacaoModal.tsx",
  "src/react/features/relatorios/components/PerformanceTab.tsx"
];

const formattersPath = path.resolve(__dirname, "src/react/shared/lib/formatters.ts");

for (const file of targetFiles) {
  const filePath = path.resolve(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes("import { fmtBRL }") || content.includes("import {fmtBRL}")) {
    console.log(`Already has fmtBRL: ${file}`);
    continue;
  }
  
  let relPath = path.relative(path.dirname(filePath), path.dirname(formattersPath));
  if (!relPath.startsWith('.')) relPath = './' + relPath;
  relPath = relPath.replace(/\\/g, '/') + '/formatters';
  
  const importStatement = `import { fmtBRL } from '${relPath}';\n`;
  content = importStatement + content;
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed ${file}`);
}
