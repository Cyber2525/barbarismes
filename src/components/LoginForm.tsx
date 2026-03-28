import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Mail, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(email);
    
    if (!result.success) {
      setError(result.error || 'Error desconegut');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogIn size={32} className="text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Iniciar Sessio</h2>
        <p className="text-sm text-gray-500 mt-1">
          Sincronitza el teu progres entre dispositius
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email del col·legi
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="1234.santignasi@fje.edu"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none transition-colors"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Format: [numero].santignasi@fje.edu
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Connectant...</span>
            </>
          ) : (
            <>
              <LogIn size={18} />
              <span>Entrar</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
