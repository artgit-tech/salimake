import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Dashboard from './pages/Dashboard';
import Programs from './pages/Programs';
import ProgramEditor from './pages/ProgramEditor';
import WorkoutLogger from './pages/WorkoutLogger';
import WeightTracker from './pages/WeightTracker';
import Measurements from './pages/Measurements';
import WorkoutHistory from './pages/WorkoutHistory';
import ExerciseTemplates from './pages/ExerciseTemplates';
import Login from './pages/Login';

function AppContent() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="app-layout">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <DataProvider>
      <div className="app-layout">
        <header className="app-header">
          <div className="header-inner">
            <NavLink to="/" className="app-logo">
              SaliMake
            </NavLink>
            <nav className="desktop-nav">
              <NavLink to="/" end>
                Etusivu
              </NavLink>
              <NavLink to="/programs">Ohjelmat</NavLink>
              <NavLink to="/templates">Kirjasto</NavLink>
              <NavLink to="/history">Historia</NavLink>
              <NavLink to="/weight">Paino</NavLink>
              <NavLink to="/measurements" className="hide-mobile">Mitat</NavLink>
              <button
                className="btn-logout"
                onClick={() => {
                  if (window.confirm('Haluatko varmasti kirjautua ulos?')) {
                    logout();
                  }
                }}
                title={user.displayName || 'Kirjaudu ulos'}
              >
                Kirjaudu ulos
              </button>
            </nav>
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/new" element={<ProgramEditor />} />
            <Route path="/programs/:id" element={<ProgramEditor />} />
            <Route path="/templates" element={<ExerciseTemplates />} />
            <Route path="/workout/:programId/:dayId" element={<WorkoutLogger />} />
            <Route path="/history" element={<WorkoutHistory />} />
            <Route path="/weight" element={<WeightTracker />} />
            <Route path="/measurements" element={<Measurements />} />
          </Routes>
        </main>
        <nav className="bottom-nav">
          <NavLink to="/" end>
            <span className="nav-icon">&#9750;</span>
            Etusivu
          </NavLink>
          <NavLink to="/programs">
            <span className="nav-icon">&#9776;</span>
            Ohjelmat
          </NavLink>
          <NavLink to="/history">
            <span className="nav-icon">&#9201;</span>
            Historia
          </NavLink>
          <NavLink to="/weight">
            <span className="nav-icon">&#9878;</span>
            Paino
          </NavLink>
          <NavLink to="/templates">
            <span className="nav-icon">&#9733;</span>
            Kirjasto
          </NavLink>
        </nav>
      </div>
    </DataProvider>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
