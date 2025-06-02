import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import GridLayout from './components/GridLayout';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>4EYES by <span className="author">[WGDIT]</span></h1>
        </header>
        <main>
          <GridLayout />
        </main>
      </div>
    </Router>
  );
};

export default App; 