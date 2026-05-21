/**
 * Export Utilities
 * Functions to export tabular data to various formats like CSV.
 */

export function exportToCSV<T>(
  data: T[], 
  columns: { key: keyof T | ((row: T) => any); label: string }[], 
  filename: string = 'export.csv'
) {
  if (!data || !data.length) return;

  const headers = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
  
  const rows = data.map(row => {
    return columns.map(col => {
      let val;
      if (typeof col.key === 'function') {
        val = col.key(row);
      } else {
        val = row[col.key];
      }
      
      if (val === null || val === undefined) val = '';
      
      const stringVal = String(val).replace(/"/g, '""');
      return `"${stringVal}"`;
    }).join(',');
  });

  const csvContent = [headers, ...rows].join('\n');
  
  // Add BOM for Excel UTF-8 support
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
