import { Routes, Route, Link } from 'react-router-dom';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TrustedContacts from './pages/TrustedContacts';
import EmergencySOS from './pages/EmergencySOS';

import './App.css';

const features = [
  {
    icon: '🆘',
    title: 'Emergency SOS',
    description: 'Quickly raise an alert when you need help.',
  },
  {
    icon: '📍',
    title: 'Live Location',
    description: 'Share your location with trusted contacts.',
  },
  {
    icon: '♡',
    title: 'Trusted Contacts',
    description: 'Stay connected with people you trust.',
  },
  {
    icon: '◷',
    title: 'Safety Timer',
    description: 'Set a timer and stay reassured during your journeys.',
  },
];

function Home() {
  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-icon">♡</span>
          NIRBHAYARAKSHA
        </Link>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="login-btn">Login</Link>
          <Link to="/signup" className="signup-btn">Sign Up</Link>
        </div>
      </nav>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">SAFE. SMART. EMPOWERED.</span>

            <h1>
              Your Safety,<br />
              Our Priority<span>.</span>
            </h1>

            <p>
              Your safety matters. Stay connected, feel confident
              and take control of your personal safety wherever
              life takes you.
            </p>

            <div className="hero-actions">
              <Link to="/signup" className="primary-btn">
                Get Started <span>→</span>
              </Link>

              <a href="#features" className="text-btn">
                Explore Features →
              </a>
            </div>

            <div className="hero-note">
              <span>♡</span>
              Your safety. Your confidence. Your freedom.
            </div>
          </div>

          <div className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85"
              alt="Woman walking confidently outdoors"
            />

            <div className="photo-caption">
              <span className="caption-heart">♡</span>
              <div>
                <strong>Move with confidence</strong>
                <small>Your safety comes first.</small>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="section-heading">
            <span>WHAT WE OFFER</span>
            <h2>Your Safety Toolkit</h2>
            <p>
              Thoughtful tools designed to help you feel safer
              and more confident.
            </p>
          </div>

          <div className="feature-grid">
            {features.map((feature, index) => (
              <article className="feature-card" key={feature.title}>
                <div className={`feature-icon icon-${index}`}>
                  {feature.icon}
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-arrow">↗</span>
              </article>
            ))}
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <span>GET STARTED</span>
            <h2>How It Works</h2>
            <p>
              Three simple steps towards a more prepared journey.
            </p>
          </div>

          <div className="steps-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <h3>Create an account</h3>
              <p>Register and set up your personal profile.</p>
            </article>

            <article className="step-card">
              <span className="step-number">02</span>
              <h3>Add trusted contacts</h3>
              <p>Choose people you can reach when needed.</p>
            </article>

            <article className="step-card">
              <span className="step-number">03</span>
              <h3>Explore safety tools</h3>
              <p>Discover the features available on your dashboard.</p>
            </article>
          </div>
        </section>

        <section className="about-section" id="about">
          <div>
            <span className="eyebrow">ABOUT NIRBHAYARAKSHA</span>
            <h2>Feel confident.<br />Move freely.</h2>
            <p>
              We aim to make personal safety more accessible
              through thoughtful technology and simple tools.
            </p>

            <Link to="/signup" className="about-btn">
              Join Us →
            </Link>
          </div>

          <div className="about-art">♡</div>
        </section>
      </main>

      <footer className="footer">
        <Link to="/" className="brand">
          <span className="brand-icon">♡</span>
          NIRBHAYARAKSHA
        </Link>

        <p>Your safety. Your confidence. Your freedom.</p>
        <span>© 2026 NIRBHAYARAKSHA</span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/trusted-contacts" element={<TrustedContacts />} />
      <Route path="/emergency-sos" element={<EmergencySOS />} />
    </Routes>
  );
}

export default App;

