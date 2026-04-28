import { FilialSwitcher } from '../filial/FilialSwitcher';

export function AppTopbar() {
  return (
    <header className="rf-topbar">
      <div className="rf-topbar__meta">
        <FilialSwitcher />
      </div>
    </header>
  );
}
