export interface CSIData {
  version: string;
  name: string;
  exportDate: string;
  barbarismes: string[];
  dialectes: string[];
}

export function exportToCSI(barbarismes: string[], dialectes: string[], userName: string = 'GUEST'): string {
  const data: CSIData = {
    version: '1.0',
    name: userName,
    exportDate: new Date().toISOString(),
    barbarismes,
    dialectes
  };
  return `EC-CSI-${userName.toUpperCase()}\n---CSI-DATA-START---\n${JSON.stringify(data, null, 2)}\n---CSI-DATA-END---`;
}

export function parseCSI(content: string): CSIData | null {
  try {
    const startMarker = '---CSI-DATA-START---';
    const endMarker = '---CSI-DATA-END---';
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);
    
    if (startIdx === -1 || endIdx === -1) return null;
    
    const jsonStr = content.slice(startIdx + startMarker.length, endIdx).trim();
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function downloadCSI(barbarismes: string[], dialectes: string[], userName: string = 'GUEST'): void {
  const content = exportToCSI(barbarismes, dialectes, userName);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `EC-CSI-${userName.toUpperCase()}.csi`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importCSI(file: File): Promise<CSIData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(parseCSI(content));
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
