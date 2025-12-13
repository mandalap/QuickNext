// ==========================================
// 21. src/utils/downloadFile.js
// ==========================================
export const downloadFile = (
  data,
  filename,
  mimeType = 'application/octet-stream'
) => {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Contoh penggunaan untuk export report
export const handleExportReport = async (reportService, filename) => {
  const result = await reportService.exportSales({
    start_date: '2024-01-01',
    end_date: '2024-12-31',
  });

  if (result.success) {
    downloadFile(result.data, filename, 'application/vnd.ms-excel');
  }
};
