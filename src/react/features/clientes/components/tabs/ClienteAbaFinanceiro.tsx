import { LoadingState, ErrorState } from '../../../../shared/ui';
import { buildReceberRoute } from '../../../../app/router/wave1Navigation';
import { FinanceiroTable } from '../ClienteProfileHelpers';

export function ClienteAbaFinanceiro({
  contasLoading,
  contasError,
  contas,
  navigate
}: any) {
  return (
    <section className="flex flex-col gap-6 animate-in fade-in duration-200">
      {contasLoading ? (
        <LoadingState title="Carregando financeiro…" />
      ) : contasError ? (
        <ErrorState title={contasError} />
      ) : (
        <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Contas a receber</h3>
          </div>
          <FinanceiroTable
            contas={contas}
            emptyTitle="Nenhum título encontrado para este cliente."
            onOpenConta={(contaId) => navigate(buildReceberRoute({ contaId }))}
          />
        </section>
      )}
    </section>
  );
}
