import { FormSection } from '../../../shared/ui';
import { useCotacaoStore } from '../store/useCotacaoStore';
import { CotacaoImport } from './CotacaoImport';
import { FornecedorForm } from './FornecedorForm';
import { ImportMapModal } from './ImportMapModal';

export function CotacaoImportPage() {
  const fornecedores = useCotacaoStore((s) => s.fornecedores);
  const config = useCotacaoStore((s) => s.config);
  const openFornModal = useCotacaoStore((s) => s.openFornModal);

  return (
    <FormSection
      title="Importar planilha"
      description="A importação assistida já roda no shell React com leitura do arquivo, mapeamento, persistência em lote e recarga da grade após concluir."
    >
      <CotacaoImport
        fornecedores={fornecedores}
        logs={config?.logs ?? []}
        onNovoFornecedor={openFornModal}
      />
      <ImportMapModal />
      <FornecedorForm />
    </FormSection>
  );
}
