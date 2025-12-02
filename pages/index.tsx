import React, { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // For now, log in with sample credentials
    if (email === 'commandant@cdssdaura.edu.ng' && password === '123456') {
      alert('Logged in as Commandant! Redirecting to dashboard...');
      window.location.href = '/report-generator'; // Links to your ReportGenerator
    } else {
      alert('Invalid credentials. Use commandant@cdssdaura.edu.ng / 123456');
    }
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-green-900 mb-2">CDSS Daura Portal</h1>
          <p className="text-gray-600">Command Day Secondary School Daura</p>
          <p className="text-sm text-gray-500">Katsina State, Nigeria</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder="commandant@cdssdaura.edu.ng"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder="123456"
              required
            />
          </div>
          <button type="submit" className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 font-medium">
            Login
          </button>
        </form>
        <div className="text-center">
          <a href="/report-generator" className="text-green-600 hover:underline text-sm">Go to Report Generator</a>
        </div>
      </div>
    </div>
  );
}
