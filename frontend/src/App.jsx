import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Heatmap from './pages/Heatmap';
import PollutantPage from './pages/PollutantPage';
import Profile from './pages/Profile';
import HistoricalAnalysis from './pages/HistoricalAnalysis';
import Rankings from './pages/Rankings';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/heatmap" element={<Layout><Heatmap /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />

        {/* Pollutant routes — with or without city ID */}
        <Route path="/pollutant/:pollutant" element={<Layout><PollutantPage /></Layout>} />
        <Route path="/city/:cityId/pollutant/:pollutant" element={<Layout><PollutantPage /></Layout>} />

        {/* Phase 4 */}
        <Route path="/history" element={<Layout><HistoricalAnalysis /></Layout>} />
        <Route path="/rankings" element={<Layout><Rankings /></Layout>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

