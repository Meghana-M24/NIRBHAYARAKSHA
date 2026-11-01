import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LiveLocation.css';

function LiveLocation() {
  const navigate = useNavigate();

  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getLocation = () => {
    setError('');
    setLocation(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });

        setLoading(false);
      },
      () => {
        setError(
          'Unable to access your location. Please allow location permission and try again.'
        );
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  };

  return (
    <div className="location-page">

      <nav className="location-navbar">
        <h2>NIRBHAYARAKSHA</h2>

        <button onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </nav>

      <main className="location-container">

        <div className="location-icon">📍</div>

        <h1>Live Location</h1>

        <p>
          Find your current location and view it on the map.
        </p>

        <button
          className="location-button"
          onClick={getLocation}
          disabled={loading}
        >
          {loading ? 'Getting Location...' : 'Get My Location'}
        </button>

        {error && (
          <div className="location-error">
            {error}
          </div>
        )}

        {location && (
          <div className="location-result">

            <h2>Your Current Location</h2>

            <p>
              <strong>Latitude:</strong> {location.latitude}
            </p>

            <p>
              <strong>Longitude:</strong> {location.longitude}
            </p>

            <p>
              <strong>Accuracy:</strong> Approximately {Math.round(location.accuracy)} metres
            </p>

            <a
              href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Google Maps
            </a>

          </div>
        )}

        <div className="location-note">
          <p>
            🔒 Your browser will ask permission before accessing your location.
          </p>
          <p>
            This is currently a frontend demonstration.
            Your location is not automatically shared with anyone.
          </p>
        </div>

      </main>
    </div>
  );
}

export default LiveLocation;

