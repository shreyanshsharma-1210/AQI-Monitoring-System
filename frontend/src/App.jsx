import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Heatmap from './pages/Heatmap';
import PollutantPage from './pages/PollutantPage';
import Profile from './pages/Profile';
import HistoricalAnalysis from './pages/HistoricalAnalysis';
import Rankings from './pages/Rankings';
import Leaderboard from './pages/Leaderboard';
import CityPickerModal from './components/CityPickerModal';
import useStore from './store/useStore';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-950 light:bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

/** Fires auto-detection once when the city list first loads and no city is saved. */
function LocationGate() {
  const { cities, selectedCityId, detectAndSelectCity, showCityPicker } = useStore();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (!cities.length) return;          // wait for cities to load
    if (selectedCityId) return;          // already have a city (saved or set)
    attempted.current = true;
    detectAndSelectCity();               // try geolocation → modal on failure
  }, [cities, selectedCityId]);

  if (!showCityPicker) return null;
  return <CityPickerModal />;
}

function App() {
  return (
    <BrowserRouter>
      <LocationGate />
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

        {/* Phase 5 */}
        <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

