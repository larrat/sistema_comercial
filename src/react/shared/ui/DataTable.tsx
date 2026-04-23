import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export type DataTableColumn<Row> = {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
};

type DataTableProps<Row> = {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  emptyTitle = 'Nenhum registro encontrado.',
  emptyDescription
}: DataTableProps<Row>) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rf-ui-data-table">
      <table className="tbl">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.className}
                style={{
                  width: column.width,
                  textAlign: column.align ?? 'left'
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.className}
                  style={{ textAlign: column.align ?? 'left' }}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
