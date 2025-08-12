import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import MainMenu from './pages/MainMenu';
import PuzzleGenerator from './pages/PuzzleGenerator';
// import PuzzleSolver from './components/pages/PuzzleSolver';
import Analytics from './pages/Analytics';
import Solution from './pages/Solution';
import About from './pages/About';

function App() {
  const [crosswordData, setCrosswordData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<MainMenu />} />
            <Route path="generate" element={<PuzzleGenerator />} />
            {/* <Route path="solve" element={<PuzzleSolver />} /> */}
            <Route path="analytics" element={<Analytics />} />
            <Route path="solution" element={<Solution />} />
            <Route path="about" element={<About />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;