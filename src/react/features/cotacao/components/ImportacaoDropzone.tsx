type Props = {
  disabled?: boolean;
  onSelect: (file: File) => void | Promise<void>;
};

export function ImportacaoDropzone({ disabled = false, onSelect }: Props) {
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    await onSelect(file);
  }

  return (
    <label
      className="upz"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        disabled={disabled}
        onChange={(e) => void handleChange(e)}
        style={{ display: 'none' }}
      />
      <div className="upload-drop-icon">ARQ</div>
      <strong className="upload-drop-title">Clique ou arraste o arquivo</strong>
      <p className="upload-drop-copy">.xlsx .xls .csv — leitura inicial e preview</p>
    </label>
  );
}
