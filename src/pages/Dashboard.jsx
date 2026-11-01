
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  const loggedInUser = JSON.parse(
    localStorage.getItem('loggedInUser') || '{}'
  );

  const userName = loggedInUser.name || 'User';

  const features = [
    {
      icon: '📍',
      title: 'Live Location',
      description: 'Share your real-time location with trusted people.',
      color: 'lavender',
      action: 'Share Location',
      onClick: () => {
        alert('Share Location button is working!');
      },
    },
    {
      icon: '👥',
      title: 'Trusted Contacts',
      description: 'Manage the people who can help you in an emergency.',
      color: 'pink',
      action: 'Manage Contacts',
      onClick: () => navigate('/trusted-contacts'),
    },
    {
      icon: '⏱️',
      title: 'Safety Timer',
      description: 'Set a timer and let your contacts know when to expect you.',
      color: 'peach',
      action: 'Start Timer',
      onClick: () => alert('Safety Timer feature will be added soon!'),
    },
    {
      icon: '🛡️',
      title: 'Safety Resources',
      description: 'Access important safety information and resources.',
      color: 'blue',
      action: 'Explore',
      onClick: () => alert('Safety Resources will be added soon!'),
    },
  ];

  function handleLogout() {
    localStorage.removeItem('loggedInUser');
    navigate('/login');
  }

  return (
    <div className="dashboard">

      <nav className="dashboard-nav">

        <div className="dashboard-logo">
          <span className="logo-icon">✦</span>
          NIRBHAYARAKSHA
        </div>

        <div className="dashboard-nav-links">
          <a href="#home">Home</a>
          <a href="#features">Safety Features</a>
          <a href="#activity">Activity</a>
        </div>

        <button
          className="profile-button"
          onClick={() => navigate('/profile')}
        >
          👤 My Profile
        </button>

      </nav>

      <main className="dashboard-content" id="home">

        <section className="welcome-section">

          <div>
            <p className="welcome-label">
              YOUR PERSONAL SAFETY SPACE
            </p>

            <h1>
              Welcome back, {userName}! 💜
            </h1>

            <p className="welcome-description">
              Your safety matters. Stay connected, stay aware,
              and move with confidence.
            </p>
          </div>

          <div className="welcome-illustration">
            <span>🛡️</span>
            <p>Your safety, our priority.</p>
          </div>

        </section>

        <section className="emergency-section">

          <div className="emergency-text">
            <p className="emergency-label">NEED HELP?</p>

            <h2>We're here for you.</h2>

            <p>
              In an emergency, use the SOS feature to initiate
              your emergency assistance workflow.
            </p>
          </div>

          <button
            className="sos-button"
            onClick={() => navigate('/emergency-sos')}
          >
            <span>🆘</span>
            Emergency SOS
          </button>

        </section>

        <section className="features-section" id="features">

          <div className="section-heading">
            <div>
              <p className="welcome-label">STAY PREPARED</p>
              <h2>Your Safety Tools</h2>
            </div>

            <p>Everything you need, in one place.</p>
          </div>

          <div className="feature-grid">

            {features.map((feature, index) => (
              <div className="feature-card" key={index}>

                <div className={`feature-icon ${feature.color}`}>
                  {feature.icon}
                </div>

                <h3>{feature.title}</h3>

                <p>{feature.description}</p>

                <button
                  className="feature-action"
                  onClick={feature.onClick}
                >
                  {feature.action} →
                </button>

              </div>
            ))}

          </div>
        </section>

        <section className="safety-reminder" id="activity">

          <div className="reminder-icon">💜</div>

          <div>
            <h3>A little reminder</h3>

            <p>
              You deserve to feel safe, confident and independent
              wherever you go.
            </p>
          </div>

        </section>

        <div className="dashboard-logout">
          <button onClick={handleLogout}>
            Logout
          </button>
        </div>

      </main>

      <footer className="dashboard-footer">
        <p>
          © 2026 NIRBHAYARAKSHA. Your Safety, Our Priority.
        </p>
      </footer>

    </div>
  );
}

export default Dashboard;

