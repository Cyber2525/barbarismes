import React, { useState, useEffect } from "react";
import { cloudSync } from "../lib/cloudSync";

interface CloudSyncStatusProps {
  email: string | null;
  onEmailChange: (email: string | null) => void;
}

export function CloudSyncStatus({ email, onEmailChange }: CloudSyncStatusProps) {
  const [status, setStatus] = useState(cloudSync.getSyncStatus());
  const [showEmailForm, setShowEmailForm] = useState(!email);
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = cloudSync.subscribe(() => {
      setStatus(cloudSync.getSyncStatus());
    });

    const timer = setInterval(() => {
      setStatus(cloudSync.getSyncStatus());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email format
    if (!emailInput.match(/^[^\s@]+@fje\.edu$/)) {
      setError("Email must be in format: something@fje.edu");
      return;
    }

    onEmailChange(emailInput);
    setShowEmailForm(false);
    setEmailInput("");
  };

  const handleLogout = () => {
    onEmailChange(null);
    setShowEmailForm(true);
    setEmailInput("");
  };

  if (showEmailForm) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg p-4 shadow-lg max-w-sm">
        <h3 className="font-semibold mb-3 text-gray-800">Cloud Sync Login</h3>
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="your.name@fje.edu"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              setError(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded text-sm font-medium hover:bg-blue-600"
          >
            Sign In / Create Account
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Cloud Sync</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status.isOnline ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs font-medium text-gray-600">
            {status.isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div className="text-xs text-gray-600 space-y-2 mb-3">
        <p>
          Email: <span className="font-mono font-semibold">{email}</span>
        </p>
        {status.syncInProgress && (
          <p className="text-blue-600">Syncing changes...</p>
        )}
        {status.queuedItems > 0 && (
          <p className="text-amber-600">
            {status.queuedItems} changes pending sync
          </p>
        )}
        {!status.isOnline && status.queuedItems > 0 && (
          <p className="text-gray-500">
            Will sync when connection restored
          </p>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="w-full bg-gray-200 text-gray-800 py-2 rounded text-xs font-medium hover:bg-gray-300"
      >
        Change Account
      </button>
    </div>
  );
}
