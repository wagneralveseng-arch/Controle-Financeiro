import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const startApp = () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    // Caso raro onde o elemento ainda não existe, tentamos novamente em breve ou lançamos erro
    console.error("Critical: Root element not found even after DOM load.");
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Garante que o DOM esteja carregado antes de tentar montar o React
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}