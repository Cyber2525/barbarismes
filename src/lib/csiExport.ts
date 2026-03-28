// CSI File Format: EC-CSI-NAME(NAME/GUEST).csi
// Text-based format for exporting/importing FETS progress data

export interface CSIData {
  version: string;
  exportDate: string;
  userName: string;
  barbarismes: string[];
  dialectes: string[];
}

// Generate CSI filename
export function generateCSIFilename(email: string | null): string {
  const name = email ? email.split('.')[0].toUpperCase() : 'GUEST';
  return `EC-CSI-${name}(${name}).csi`;
}

// Export to CSI format
export function exportToCSI(
  email: string | null,
  barbarismes: string[],
  dialectes: string[]
): string {
  const userName = email ? email.split('.')[0].toUpperCase() : 'GUEST';
  
  const data: CSIData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    userName,
    barbarismes,
    dialectes,
  };

  // CSI format: simple text-based
  const lines = [
    `# EC-CSI Export File`,
    `# Generated: ${data.exportDate}`,
    `# User: ${data.userName}`,
    ``,
    `[VERSION]`,
    data.version,
    ``,
    `[USER]`,
    data.userName,
    ``,
    `[BARBARISMES]`,
    ...data.barbarismes.map(b => b),
    ``,
    `[DIALECTES]`,
    ...data.dialectes.map(d => d),
    ``,
    `# END OF FILE`,
  ];

  return lines.join('\n');
}

// Parse CSI file content
export function parseCSI(content: string): CSIData | null {
  try {
    const lines = content.split('\n').map(l => l.trim());
    
    let currentSection = '';
    const barbarismes: string[] = [];
    const dialectes: string[] = [];
    let userName = 'GUEST';
    let version = '1.0';

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || line === '') {
        continue;
      }

      // Section headers
      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.slice(1, -1).toUpperCase();
        continue;
      }

      // Parse based on section
      switch (currentSection) {
        case 'VERSION':
          version = line;
          break;
        case 'USER':
          userName = line;
          break;
        case 'BARBARISMES':
          if (line) barbarismes.push(line);
          break;
        case 'DIALECTES':
          if (line) dialectes.push(line);
          break;
      }
    }

    return {
      version,
      exportDate: new Date().toISOString(),
      userName,
      barbarismes,
      dialectes,
    };
  } catch (error) {
    console.error('[CSI] Error parsing file:', error);
    return null;
  }
}

// Merge imported data with existing
export function mergeCSIData(
  existing: { barbarismes: string[]; dialectes: string[] },
  imported: CSIData
): { barbarismes: string[]; dialectes: string[] } {
  return {
    barbarismes: Array.from(new Set([...existing.barbarismes, ...imported.barbarismes])),
    dialectes: Array.from(new Set([...existing.dialectes, ...imported.dialectes])),
  };
}

// Download CSI file
export function downloadCSI(email: string | null, barbarismes: string[], dialectes: string[]): void {
  const content = exportToCSI(email, barbarismes, dialectes);
  const filename = generateCSIFilename(email);
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Read CSI file from input
export function readCSIFile(file: File): Promise<CSIData | null> {
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
