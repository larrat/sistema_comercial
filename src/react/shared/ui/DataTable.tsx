import { useMemo, type ReactNode } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef
} from '@tanstack/react-table';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Button } from './Button';
import { cn } from './index';

export type DataTableColumn<Row> = {
  key: string;
  header?: ReactNode;
  label?: ReactNode;
  render: (row: Row) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
  sortable?: boolean;
};

type DataTableProps<Row> = {
  columns: Array<DataTableColumn<Row>>;
  data?: Row[];
  rows?: Row[];
  rowKey?: (row: Row, index: number) => string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  emptyIcon?: ReactNode;
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
  density?: 'default' | 'compact';
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string, dir: 'asc' | 'desc') => void;
};

export function DataTable<Row>({
  columns,
  data,
  rows = [],
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nenhum registro encontrado.',
  emptyDescription,
  emptyAction,
  emptyIcon,
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
  pageSizeOptions = [10, 20, 50],
  density = 'default',
  sortKey,
  sortDir,
  onSort
}: DataTableProps<Row>) {
  const tableData = useMemo(() => data ?? rows, [data, rows]);

  const tableColumns = useMemo(() => {
    const cols: ColumnDef<Row, any>[] = columns.map((col) => ({
      id: col.key,
      header: () => col.header ?? col.label ?? '',
      cell: (info) => col.render(info.row.original),
      meta: {
        align: col.align,
        width: col.width,
        className: col.className,
        sortable: col.sortable
      }
    }));

    if (renderActions) {
      cols.push({
        id: '__actions__',
        header: () => 'Ações',
        cell: (info) => renderActions(info.row.original, info.row.index),
        meta: {
          align: 'right',
          width: '80px'
        }
      });
    }

    return cols;
  }, [columns, renderActions]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  const hasPagination =
    typeof page === 'number' &&
    typeof pageSize === 'number' &&
    typeof total === 'number' &&
    typeof onPageChange === 'function';

  const safePageSize = pageSize ?? (tableData.length || 1);
  const totalItems = total ?? tableData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const fromItem = totalItems === 0 ? 0 : ((page ?? 1) - 1) * safePageSize + 1;
  const toItem = totalItems === 0 ? 0 : Math.min(totalItems, (page ?? 1) * safePageSize);

  const containerClass = cn(
    'w-full bg-slate-900/40 border border-slate-700/50 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden',
    className
  );

  const cellPadding = density === 'compact' ? 'px-4 py-2' : 'px-6 py-4';

  if (loading) {
    return (
      <div className={containerClass}>
        <table className="w-full text-left text-sm text-slate-300 border-collapse">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      className={cn("font-semibold text-slate-200 tracking-wider text-xs uppercase whitespace-nowrap", cellPadding)}
                      style={{ textAlign: (header.column.columnDef.meta as any)?.align ?? 'left' }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b border-slate-700/50">
                {tableColumns.map((col, j) => (
                  <td key={j} className={cellPadding}>
                    <div className="h-4 bg-slate-800 rounded animate-pulse w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) return <ErrorState title={error} onRetry={onRetry} compact />;
  if (!tableData.length) return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  return (
    <div className={containerClass}>
      <div className="overflow-x-auto scrollbar-hide w-full">
        <table className="w-full min-w-[640px] md:min-w-0 text-left text-sm text-slate-300 border-collapse tabular-nums">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-slate-700/50 bg-slate-800/50">
                {headerGroup.headers.map(header => {
                  const meta = header.column.columnDef.meta as any;
                  const isSortable = meta?.sortable && Boolean(onSort);
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "font-semibold text-slate-200 tracking-wider text-[11px] uppercase whitespace-nowrap group transition-colors",
                        isSortable && "hover:text-emerald-400 hover:bg-slate-700/30",
                        cellPadding
                      )}
                      style={{
                        width: meta?.width,
                        textAlign: meta?.align ?? 'left',
                        cursor: isSortable ? 'pointer' : undefined,
                        userSelect: isSortable ? 'none' : undefined
                      }}
                      onClick={isSortable ? () => {
                        const nextDir = sortKey === header.id && sortDir === 'asc' ? 'desc' : 'asc';
                        onSort?.(header.id, nextDir);
                      } : undefined}
                    >
                      <div className={cn("flex items-center gap-1.5", meta?.align === 'right' ? 'justify-end' : meta?.align === 'center' ? 'justify-center' : 'justify-start')}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {isSortable && (
                          <span className="text-[10px] opacity-40 group-hover:opacity-100 transition-opacity">
                            {sortKey === header.id ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original, row.index) : undefined}
                className={cn(
                  "border-b border-slate-700/50 hover:bg-slate-800/40 transition-colors group",
                  getRowClassName ? getRowClassName(row.original, row.index) : undefined
                )}
                style={{ 
                  ...(onRowClick ? { cursor: 'pointer' } : {}),
                  contentVisibility: 'auto',
                  containIntrinsicSize: '0 64px'
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <td 
                    key={cell.id} 
                    style={{ textAlign: (cell.column.columnDef.meta as any)?.align ?? 'left' }}
                    className={cn("whitespace-nowrap transition-colors", cellPadding, (cell.column.columnDef.meta as any)?.className)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasPagination && (
        <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-medium">
            {fromItem}-{toItem} de {totalItems}
          </div>
          <div className="flex items-center gap-3">
            {onPageSizeChange && (
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:ring-2 focus:ring-emerald-500/50 outline-none cursor-pointer"
                value={safePageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>{size} / página</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => onPageChange?.((page ?? 1) - 1)} disabled={(page ?? 1) <= 1}>Anterior</Button>
              <span className="text-xs font-semibold text-slate-300">Página {page} de {totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => onPageChange?.((page ?? 1) + 1)} disabled={(page ?? 1) >= totalPages}>Próxima</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
