import { useState, useEffect } from 'react';

interface HealthResponse {
  status: string;
  instanceId: string;
  timestamp: string;
  redis: string;
  connections: { db: number; dbIdle: number };
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Unified Commerce Dashboard</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {health ? (
        <div>
          <p>API Status: {health.status}</p>
          <p>Instance: {health.instanceId}</p>
          <p>Redis: {health.redis}</p>
          <p>DB Connections: {health.connections.db} (idle: {health.connections.dbIdle})</p>
          <p>Server Time: {health.timestamp}</p>
        </div>
      ) : (
        !error && <p>Loading...</p>
      )}
    </div>
  );
}

export default App;
