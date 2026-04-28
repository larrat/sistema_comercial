import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export type DataTableColumn<Row> = {
  key: string;
  header?: ReactNode;
  label?: ReactNode;
  render: (row: Row) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
};

type DataTableProps<Row> = {
  columns: Array<DataTableColumn<Row>>;
  data?: Row[];
  rows?: Row[];
  rowKey?: (row: Row, index: number) => string;
  loading?: boolean;
  error?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  skeletonRows?: number;
  onRowClick?: (row: Row, index: number) => void;
  renderActions?: (row: Row, index: number) => ReactNode;
  className?: string;
  getRowClassName?: (row: Row, index: number) => string | undefined;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export function DataTable<Row>({
  columns,
  data,
  rows = [],
  rowKey,
  loading,
  error,
  emptyTitle = 'Nenhum registro encontrado.',
  emptyDescription,
  emptyAction,
  skeletonRows = 5,
  onRowClick,
  renderActions,
  className,
  getRowClassName,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50]
}: DataTableProps<Row>) {
  const tableRows = data ?? rows;
  const hasActions = Boolean(renderActions);
  const tableColumns = hasActions
    ? [...columns, { key: '__actions__', label: 'Ações', align: 'right' as const }]
    : columns;

  function getHeaderLabel(column: DataTableColumn<Row> | { key: string; label?: ReactNode }) {
    if ('header' in column) return column.header ?? column.label ?? '';
    return column.label ?? '';
  }

  const hasPagination =
    typeof page === 'number' &&
    typeof pageSize === 'number' &&
    typeof total === 'number' &&
    typeof onPageChange === 'function';
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.max(1, pageSize ?? tableRows.length || 1);
  const totalItems = Math.max(0, total ?? tableRows.length);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const fromItem = totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const toItem = totalItems === 0 ? 0 : Math.min(totalItems, safePage * safePageSize);

  function goToPage(nextPage: number) {
    if (!hasPagination) return;
    const clampedPage = Math.min(Math.max(1, nextPage), totalPages);
    if (clampedPage !== safePage) onPageChange?.(clampedPage);
  }

  if (loading) {
    return (
      <div className={`rf-ui-data-table${className ? ` ${className}` : ''}`}>
        <table className="tbl">
          <thead>
            <tr>
              {tableColumns.map((column) => (
                <th
                  key={column.key}
                  className={'className' in column ? column.className : undefined}
                  scope="col"
                  style={{
                    width: 'width' in column ? column.width : undefined,
                    textAlign: column.align ?? 'left'
                  }}
                >
                  {getHeaderLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i}>
                {tableColumns.map((column) => (
                  <td key={column.key}>
                    <div className="sk-line" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return <EmptyState title={error} compact />;
  }

  if (!tableRows.length) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  return (
    <div className={`rf-ui-data-table${className ? ` ${className}` : ''}`}>
      <table className="tbl">
        <thead>
          <tr>
            {tableColumns.map((column) => (
              <th
                key={column.key}
                className={'className' in column ? column.className : undefined}
                style={{
                  width: 'width' in column ? column.width : undefined,
                  textAlign: column.align ?? 'left'
                }}
              >
                {getHeaderLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, index) => (
            <tr
              key={rowKey ? rowKey(row, index) : String((row as { id?: string }).id ?? index)}
              onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') onRowClick(row, index);
                    }
                  : undefined
              }
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
              className={getRowClassName ? getRowClassName(row, index) : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.className}
                  style={{ textAlign: column.align ?? 'left' }}
                >
                  {column.render(row)}
                </td>
              ))}
              {renderActions ? (
                <td
                  style={{ textAlign: 'right' }}
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  {renderActions(row, index)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {hasPagination ? (
        <div className="rf-ui-data-table__pagination">
          <div className="rf-ui-data-table__pagination-meta">
            {fromItem}-{toItem} de {totalItems}
          </div>
          <div className="rf-ui-data-table__pagination-controls">
            {onPageSizeChange ? (
              <select
                className="inp sel"
                value={safePageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                aria-label="Itens por página"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} / página
                  </option>
                ))}
              </select>
            ) : null}
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
            >
              Anterior
            </button>
            <span className="rf-ui-data-table__pagination-page">
              Página {safePage} de {totalPages}
            </span>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
