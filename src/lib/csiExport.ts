/**
 * CSI Export/Import Format
 * Format: EC-CSI-NAME(NAME/GUEST).csi
 * Content: Plain text with JSON data
 */

export interface CSIData {
  name: string;
  role: "NAME" | "GUEST";
  doneBarbarismes: string[];
  doneDialectes: string[];
  exportedAt: string;
}

export function generateCSIFilename(name: string, role: "NAME" | "GUEST" = "NAME"): string {
  // Clean name for filename (remove special chars)
  const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `EC-CSI-${cleanName}(${role}).csi`;
}

export function exportToCSI(
  email: string,
  doneBarbarismes: string[],
  doneDialectes: string[],
  role: "NAME" | "GUEST" = "NAME"
): string {
  const data: CSIData = {
    name: email,
    role,
    doneBarbarismes,
    doneDialectes,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

export function importFromCSI(
  content: string
): { success: boolean; data?: CSIData; error?: string } {
  try {
    const data = JSON.parse(content) as CSIData;

    // Validate structure
    if (!data.name || !data.role || !Array.isArray(data.doneBarbarismes) || !Array.isArray(data.doneDialectes)) {
      throw new Error("Invalid CSI format: missing required fields");
    }

    if (!["NAME", "GUEST"].includes(data.role)) {
      throw new Error("Invalid role: must be NAME or GUEST");
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid CSI file",
    };
  }
}

export function mergeProgressData(
  existing: {
    barbarismes: string[];
    dialectes: string[];
  },
  imported: CSIData,
  mode: "merge" | "replace"
): {
  barbarismes: string[];
  dialectes: string[];
} {
  if (mode === "replace") {
    return {
      barbarismes: imported.doneBarbarismes,
      dialectes: imported.doneDialectes,
    };
  }

  // Merge mode: combine arrays and deduplicate
  const barbarismes = Array.from(
    new Set([...existing.barbarismes, ...imported.doneBarbarismes])
  );
  const dialectes = Array.from(
    new Set([...existing.dialectes, ...imported.doneDialectes])
  );

  return { barbarismes, dialectes };
}
