import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import './Auth.css';

function AuthPage({ onLogin }) {
  const [isLoginView, setIsLoginView] = useState(true);

  return (
    <div className="auth-page">
      {isLoginView ? (
        <Login
          onLogin={onLogin}
          onSwitchToRegister={() => setIsLoginView(false)}
        />
      ) : (
        <Register
          onSwitchToLogin={() => setIsLoginView(true)}
        />
      )}
    </div>
  );
}

export default AuthPage; 