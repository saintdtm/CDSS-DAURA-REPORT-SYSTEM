
import React, { useState } from 'react';
import { db } from '../services/storage';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.SUBJECT_TEACHER);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const settings = db.getSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await db.login(email, password);
        onLogin(user);
      } else if (mode === 'register') {
        await db.register(email, fullName, role, password);
        alert("Registration successful! Please wait for Admin approval.");
        setMode('login');
      } else {
        await db.resetPasswordRequest(email);
        alert("If the email exists, a reset link has been sent (Check Console).");
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 cdss-gradient">
      <div className="max-w-md w-full space-y-8 glass-panel p-10 rounded-2xl shadow-2xl">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-md overflow-hidden">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-20 w-20 object-contain" />
            ) : (
              <span className="text-4xl">🎓</span>
            )}
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-green-900">
            CDSS DAURA
          </h2>
          <p className="mt-2 text-sm text-green-800 font-medium">
            Digital Report Card System
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-600 text-sm text-center bg-red-100 p-2 rounded">{error}</div>}
          
          <div className="rounded-md shadow-sm -space-y-px">
            {mode === 'register' && (
              <>
                <div>
                  <input
                    type="text" required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                    placeholder="Full Name"
                    value={fullName} onChange={e => setFullName(e.target.value)}
                  />
                </div>
                <div>
                   <select 
                    value={role} onChange={e => setRole(e.target.value as UserRole)}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                   >
                     {Object.values(UserRole).filter(r => r !== UserRole.SUPER_ADMIN).map(r => (
                       <option key={r} value={r}>{r.replace('_', ' ')}</option>
                     ))}
                   </select>
                </div>
              </>
            )}
            
            <div>
              <input
                type="email" required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm ${mode === 'login' ? 'rounded-t-md' : ''}`}
                placeholder="Email address"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            
            {mode !== 'forgot' && (
              <div>
                <input
                  type="password" required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-800 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Register' : 'Send Reset Link'}
            </button>
          </div>
          
          <div className="flex justify-between text-sm">
             {mode === 'login' ? (
               <>
                <button type="button" onClick={() => setMode('register')} className="font-medium text-green-800 hover:text-green-700">Create Account</button>
                <button type="button" onClick={() => setMode('forgot')} className="font-medium text-green-800 hover:text-green-700">Forgot Password?</button>
               </>
             ) : (
               <button type="button" onClick={() => setMode('login')} className="font-medium text-green-800 hover:text-green-700 w-full text-center">Back to Login</button>
             )}
          </div>
        </form>
      </div>
    </div>
  );
};
