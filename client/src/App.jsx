// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/index'; // Importing the main router from routes/index.jsx
import { AuthProvider } from './context/AuthContext';// Importing the Auth provider
import { SocketProvider } from './context/SocketContext';

function App() {
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