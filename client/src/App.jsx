// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/index';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import useKeepAlive from './hooks/useKeepAlive';

function App() {
  useKeepAlive(); // Keeps the Render free-tier server warm — pings /api/ping/ every 14 min
  return (
    // Wrap the entire application in the AuthProvider
    // This makes user data available everywhere
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          {/* AppRoutes contains all routing logic, including layouts */}
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;