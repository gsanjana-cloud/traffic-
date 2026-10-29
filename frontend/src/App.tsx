import React, { useState, useEffect } from 'react';
import { SimulationState, Direction } from './types/traffic';
import { fetchSimulationState } from './services/api';
import { wsClient } from './services/websocket';
import { Navbar } from './components/Navbar';
import { Sidebar, TabId } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { DetectionPage } from './pages/DetectionPage';
import { DecisionEnginePage } from './pages/DecisionEnginePage';
import { DynamicTimingPage } from './pages/DynamicTimingPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsAboutPage } from './pages/SettingsAboutPage';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabId>('overview');
  const [state, setState] = useState<SimulationState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Initial state fetch
    fetchSimulationState()
      .then(setState)
      .catch((err) => console.warn('Backend polling initial state notice:', err));

    // Connect WebSocket
    wsClient.connect((newState) => {
      setState(newState);
      setIsConnected(true);
    });

    const checkInterval = setInterval(() => {
      setIsConnected(wsClient.isConnected());
      // If websocket is disconnected, poll via HTTP as fallback
      if (!wsClient.isConnected()) {
        fetchSimulationState().then(setState).catch(() => {});
      }
    }, 1500);

    return () => {
      clearInterval(checkInterval);
      wsClient.disconnect();
    };
  }, []);

  const handleStateChange = (newState: SimulationState) => {
    setState(newState);
  };

  const handleSelectDirectionFromOverview = (dir: Direction) => {
    setCurrentTab('simulator');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <Navbar
        state={state}
        onStateChange={handleStateChange}
        isConnected={isConnected}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          {currentTab === 'overview' && (
            <OverviewPage
              state={state}
              onSelectDirection={handleSelectDirectionFromOverview}
            />
          )}

          {currentTab === 'simulator' && (
            <SimulatorPage
              state={state}
              onStateChange={handleStateChange}
            />
          )}

          {currentTab === 'detection' && (
            <DetectionPage
              onVehicleInjected={() => {
                fetchSimulationState().then(setState);
              }}
            />
          )}

          {currentTab === 'decision' && (
            <DecisionEnginePage
              state={state}
              onSettingsUpdated={() => {
                fetchSimulationState().then(setState);
              }}
            />
          )}

          {currentTab === 'timing' && (
            <DynamicTimingPage
              state={state}
              onSettingsUpdated={() => {
                fetchSimulationState().then(setState);
              }}
            />
          )}

          {currentTab === 'evaluation' && <EvaluationPage />}

          {currentTab === 'analytics' && <AnalyticsPage />}

          {currentTab === 'settings' && <SettingsAboutPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
