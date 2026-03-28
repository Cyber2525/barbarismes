import React, { useState } from "react";
import { exportToCSI, importFromCSI, mergeProgressData, generateCSIFilename } from "../lib/csiExport";

interface ImportExportProps {
  email: string;
  doneBarbarismes: string[];
  doneDialectes: string[];
  onImport: (barbarismes: string[], dialectes: string[]) => void;
}

export function ImportExportPanel({
  email,
  doneBarbarismes,
  doneDialectes,
  onImport,
}: ImportExportProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);

  const handleExport = () => {
    const csiContent = exportToCSI(email, doneBarbarismes, doneDialectes, "NAME");
    const filename = generateCSIFilename(email, "NAME");

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(csiContent)
    );
    element.setAttribute("download", filename);
    element.style.display = "none";

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = importFromCSI(content);

      if (!result.success) {
        setImportError(result.error || "Failed to import file");
        return;
      }

      setPendingImportData(result.data);
      setShowModeSelection(true);
      setImportError(null);
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!pendingImportData) return;

    const merged = mergeProgressData(
      { barbarismes: doneBarbarismes, dialectes: doneDialectes },
      pendingImportData,
      importMode
    );

    onImport(merged.barbarismes, merged.dialectes);

    // Reset state
    setPendingImportData(null);
    setShowModeSelection(false);
    setImportError(null);
  };

  if (showModeSelection) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm">
          <h3 className="font-semibold text-lg mb-4">Import Progress Data</h3>

          <p className="text-sm text-gray-600 mb-4">
            How would you like to merge the imported data?
          </p>

          <div className="space-y-3 mb-6">
            <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="import-mode"
                value="merge"
                checked={importMode === "merge"}
                onChange={(e) => setImportMode(e.target.value as "merge" | "replace")}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-sm">Merge</div>
                <div className="text-xs text-gray-600">Combine with existing progress</div>
              </div>
            </label>

            <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="import-mode"
                value="replace"
                checked={importMode === "replace"}
                onChange={(e) => setImportMode(e.target.value as "merge" | "replace")}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-sm">Replace</div>
                <div className="text-xs text-gray-600">Overwrite with imported data</div>
              </div>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowModeSelection(false);
                setPendingImportData(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600"
            >
              Confirm Import
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 left-4 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 text-sm font-medium"
      >
        Import / Export
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white border-2 border-gray-300 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Import / Export Data</h3>
        <button
          onClick={() => setShowPanel(false)}
          className="text-gray-500 hover:text-gray-700 text-lg"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleExport}
          className="w-full bg-green-500 text-white py-2 rounded text-sm font-medium hover:bg-green-600"
        >
          Export as .csi File
        </button>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Import .csi File
          </label>
          <input
            type="file"
            accept=".csi,.txt"
            onChange={handleFileSelect}
            className="w-full text-xs"
          />
        </div>

        {importError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-xs">
            {importError}
          </div>
        )}

        <p className="text-xs text-gray-600">
          Format: <span className="font-mono">EC-CSI-NAME(NAME/GUEST).csi</span>
        </p>
      </div>
    </div>
  );
}
