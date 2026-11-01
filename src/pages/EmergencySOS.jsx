
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EmergencySOS.css';

function EmergencySOS() {
  const navigate = useNavigate();

  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const [contacts] = useState(() => {
    const saved = localStorage.getItem('trustedContacts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!sosActive || countdown === 0) return;

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [sosActive, countdown]);

  const activateSOS = () => {
    setSosActive(true);
    setCountdown(5);
  };

  const cancelSOS = () => {
    setSosActive(false);
    setCountdown(5);
  };

  return (
    <div className="sos-page">

      <nav className="sos-navbar">
        <h2>NIRBHAYARAKSHA</h2>

        <button onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </nav>

      <main className="sos-container">

        <h1>Emergency SOS</h1>

        <p className="sos-description">
          Your safety matters. Activate SOS when you need
          immediate assistance.
        </p>

        <div className="sos-circle">
          <button
            className="sos-main-button"
            onClick={activateSOS}
            disabled={sosActive}
          >
            SOS
            <span>HELP ME</span>
          </button>
        </div>

        {sosActive && countdown > 0 && (
          <div className="sos-alert">
            <h2>Emergency activation countdown</h2>
            <h1>{countdown}</h1>
            <p>Cancel if you activated this accidentally.</p>

            <button onClick={cancelSOS}>
              Cancel SOS
            </button>
          </div>
        )}

        {sosActive && countdown === 0 && (
          <div className="sos-alert">
            <h2>SOS countdown completed</h2>

            <p>
              This is a frontend demonstration.
              No emergency message has been sent.
            </p>

            <button onClick={cancelSOS}>
              Reset SOS
            </button>
          </div>
        )}

        {/* TRUSTED CONTACTS */}

        <div className="sos-contacts">

          <h2>Your Emergency Contacts</h2>

          <p>
            People in your safety circle who you can reach.
          </p>

          {contacts.length === 0 ? (

            <div className="sos-empty-contacts">
              <p>No trusted contacts added yet.</p>

              <button
                onClick={() => navigate('/trusted-contacts')}
              >
                Add Trusted Contacts
              </button>
            </div>

          ) : (

            <div className="sos-contact-list">

              {contacts.map((contact, index) => (

                <div className="sos-contact-card" key={index}>

                  <div className="sos-contact-avatar">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="sos-contact-details">
                    <h3>{contact.name}</h3>
                    <p>{contact.phone}</p>
                    <span>{contact.relationship}</span>
                  </div>

                  <a
                    className="sos-call-button"
                    href={`tel:${contact.phone}`}
                  >
                    📞 Call
                  </a>

                </div>

              ))}

            </div>

          )}

        </div>

        <div className="sos-info">
          <h3>When should you use SOS?</h3>

          <p>
            Use this feature when you feel unsafe or
            need emergency assistance.
          </p>
        </div>

      </main>
    </div>
  );
}

export default EmergencySOS;

