import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Programs from './pages/Programs';
import ProgramEditor from './pages/ProgramEditor';
import WorkoutLogger from './pages/WorkoutLogger';
import WeightTracker from './pages/WeightTracker';
import Measurements from './pages/Measurements';
import WorkoutHistory from './pages/WorkoutHistory';

function App() {
  return (
    <HashRouter>
      <div className="app-layout">
        <header className="app-header">
          <div className="header-inner">
            <NavLink to="/" className="app-logo">
              SaliMake
            </NavLink>
            <nav>
              <NavLink to="/" end>
                Etusivu
              </NavLink>
              <NavLink to="/programs">Ohjelmat</NavLink>
              <NavLink to="/history">Historia</NavLink>
              <NavLink to="/weight">Paino</NavLink>
              <NavLink to="/measurements">Mitat</NavLink>
            </nav>
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/new" element={<ProgramEditor />} />
            <Route path="/programs/:id" element={<ProgramEditor />} />
            <Route path="/workout/:programId/:dayId" element={<WorkoutLogger />} />
            <Route path="/history" element={<WorkoutHistory />} />
            <Route path="/weight" element={<WeightTracker />} />
            <Route path="/measurements" element={<Measurements />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
