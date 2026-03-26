/**
 * Export/Import utilities for CSI format
 * Format: EC-CSI-NAME(NAME/GUEST).csi
 */

export interface CSIExportData {
  version: '1.0';
  exportDate: string;
  userName: string;
  userType: 'NAME' | 'GUEST';
  doneItems: string[];
  doneDialectItems: string[];
}

/**
 * Parse CSI filename to extract user info
 */
export function parseCSIFilename(filename: string): {
  userName: string;
  userType: 'NAME' | 'GUEST';
} | null {
  const match = filename.match(/EC-CSI-(.+?)\((.+?)\)\.csi$/i);
  if (!match) return null;
  return {
    userName: match[1],
    userType: (match[2] as 'NAME' | 'GUEST')
  };
}

/**
 * Generate CSI filename
 */
export function generateCSIFilename(userName: string, userType: 'NAME' | 'GUEST' = 'GUEST'): string {
  return `EC-CSI-${userName}(${userType}).csi`;
}

/**
 * Export done items to CSI format
 */
export function exportToCSI(
  doneItems: string[],
  doneDialectItems: string[],
  userName: string = 'EXPORT',
  userType: 'NAME' | 'GUEST' = 'GUEST'
): string {
  const data: CSIExportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    userName,
    userType,
    doneItems,
    doneDialectItems
  };

  // Create text format that can be edited and re-imported
  const textContent = `EC-CSI-EXPORT
Version: ${data.version}
ExportDate: ${data.exportDate}
UserName: ${data.userName}
UserType: ${data.userType}

[BARBARISMES]
${data.doneItems.map(item => `- ${item}`).join('\n')}

[DIALECTES]
${data.doneDialectItems.map(item => `- ${item}`).join('\n')}
`;

  // For actual file format, we'll use JSON but with .csi extension
  const csiContent = JSON.stringify(data, null, 2);
  
  return csiContent;
}

/**
 * Import from CSI format
 */
export function importFromCSI(content: string): CSIExportData | null {
  try {
    // Try JSON parsing first
    const data = JSON.parse(content) as CSIExportData;
    
    if (!data.version || !data.exportDate || !data.doneItems || !data.doneDialectItems) {
      return null;
    }

    return data;
  } catch {
    // Try text format parsing
    try {
      const lines = content.split('\n');
      const data: CSIExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        userName: 'IMPORTED',
        userType: 'GUEST',
        doneItems: [],
        doneDialectItems: []
      };

      let currentSection = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed === '[BARBARISMES]') {
          currentSection = 'barbarismes';
          continue;
        }
        if (trimmed === '[DIALECTES]') {
          currentSection = 'dialectes';
          continue;
        }
        
        if (trimmed.startsWith('UserName:')) {
          data.userName = trimmed.replace('UserName:', '').trim();
        }
        if (trimmed.startsWith('UserType:')) {
          data.userType = trimmed.replace('UserType:', '').trim() as 'NAME' | 'GUEST';
        }
        
        if (trimmed.startsWith('-')) {
          const item = trimmed.replace(/^-\s*/, '').trim();
          if (item) {
            if (currentSection === 'barbarismes') {
              data.doneItems.push(item);
            } else if (currentSection === 'dialectes') {
              data.doneDialectItems.push(item);
            }
          }
        }
      }

      return data;
    } catch {
      return null;
    }
  }
}

/**
 * Merge import data with existing data
 */
export function mergeCSIData(
  existing: { doneItems: string[]; doneDialectItems: string[] },
  imported: CSIExportData
): { doneItems: string[]; doneDialectItems: string[] } {
  const doneItems = Array.from(new Set([...existing.doneItems, ...imported.doneItems]));
  const doneDialectItems = Array.from(new Set([...existing.doneDialectItems, ...imported.doneDialectItems]));
  
  return { doneItems, doneDialectItems };
}

/**
 * Replace existing data with imported data
 */
export function replaceCSIData(
  imported: CSIExportData
): { doneItems: string[]; doneDialectItems: string[] } {
  return {
    doneItems: imported.doneItems,
    doneDialectItems: imported.doneDialectItems
  };
}

/**
 * Create download link for CSI file
 */
export function downloadCSIFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
