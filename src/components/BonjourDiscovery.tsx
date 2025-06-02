import React, { useState, useEffect } from 'react';

interface BonjourService {
  name: string;
  type: string;
  domain: string;
  host: string;
  address: string;
  port: number;
}

interface BonjourDiscoveryProps {
  onServiceSelect: (service: BonjourService) => void;
}

const BonjourDiscovery: React.FC<BonjourDiscoveryProps> = ({ onServiceSelect }) => {
  const [services, setServices] = useState<BonjourService[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  const startDiscovery = async () => {
    setIsDiscovering(true);
    setError(null);
    setScanProgress(0);
    setServices([]);
    
    try {
      // Get the user's IP address to determine the subnet
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      const userIp = data.ip;
      const subnet = userIp.split('.').slice(0, 3).join('.');
      
      const commonPorts = [80, 443, 8080, 3000, 5000, 8000, 8888];
      const foundServices: BonjourService[] = [];
      let progress = 0;

      // Scan in parallel for faster discovery
      const scanPromises: Promise<void>[] = [];
      for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        
        for (const port of commonPorts) {
          const scanPromise = new Promise<void>(async (resolve) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 1000);
              
              const response = await fetch(`http://${ip}:${port}`, {
                mode: 'no-cors',
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);
              
              foundServices.push({
                name: `Device at ${ip}:${port}`,
                type: '_http._tcp',
                domain: 'local',
                host: ip,
                address: ip,
                port: port
              });
              
              // Update services immediately when found
              setServices([...foundServices]);
            } catch {
              // Ignore failed connections
            }
            
            progress++;
            setScanProgress(Math.floor((progress / (254 * commonPorts.length)) * 100));
            resolve();
          });
          
          scanPromises.push(scanPromise);
        }
      }

      await Promise.all(scanPromises);
      setServices(foundServices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsDiscovering(false);
      setScanProgress(100);
    }
  };

  useEffect(() => {
    // Start discovery when component mounts
    startDiscovery();
  }, []);

  const handleServiceSelect = (service: BonjourService) => {
    const url = `http://${service.address}:${service.port}`;
    onServiceSelect({
      ...service,
      name: url,  // Use the full URL as the name for clarity
    });
  };

  return (
    <div className="bonjour-discovery" style={{
      padding: '10px',
      backgroundColor: '#2a2a2a',
      borderRadius: '4px',
      color: '#fff',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '300px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>Network Discovery</h3>
        <button
          onClick={startDiscovery}
          disabled={isDiscovering}
          style={{
            padding: '4px 8px',
            backgroundColor: isDiscovering ? '#666' : '#404040',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isDiscovering ? 'default' : 'pointer',
            fontSize: '12px'
          }}
        >
          {isDiscovering ? `Scanning ${scanProgress}%` : 'Rescan'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ff4444', marginBottom: '10px', fontSize: '12px' }}>
          Error: {error}
        </div>
      )}

      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        border: '1px solid #404040',
        borderRadius: '4px',
        backgroundColor: '#1a1a1a'
      }}>
        {services.length === 0 ? (
          <div style={{ padding: '10px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
            {isDiscovering ? `Scanning network... ${scanProgress}%` : 'No devices found'}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {services.map((service, index) => (
              <li
                key={`${service.address}:${service.port}`}
                style={{
                  padding: '8px',
                  borderBottom: index < services.length - 1 ? '1px solid #404040' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#2a2a2a',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLLIElement).style.backgroundColor = '#333';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLLIElement).style.backgroundColor = '#2a2a2a';
                }}
                onClick={() => handleServiceSelect(service)}
              >
                <span style={{ fontSize: '12px', color: '#fff' }}>{service.name}</span>
                <button
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#666',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleServiceSelect(service);
                  }}
                >
                  Connect
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BonjourDiscovery; 