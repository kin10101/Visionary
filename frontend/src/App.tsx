import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CreateSpec from './pages/CreateSpec';
import ViewSpec from './pages/ViewSpec';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/specs/new" element={<CreateSpec />} />
        <Route path="/specs/:id" element={<ViewSpec />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
