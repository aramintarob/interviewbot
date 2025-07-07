import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Interview from './pages/Interview';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/interview/:id" element={<Interview />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
