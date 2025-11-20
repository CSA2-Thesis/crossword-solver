import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import MainMenu from './pages/MainMenu';
import PuzzleGenerator from './pages/PuzzleGenerator';
import Analytics from './pages/Analytics';
import Solution from './pages/Solution';
import About from './pages/About';

function App() {
  return (
    
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MainMenu />} />
          <Route path="generate" element={<PuzzleGenerator />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="solution" element={<Solution />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;