import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const existingUsers = JSON.parse(
      localStorage.getItem('users') || '[]'
    );

    const emailExists = existingUsers.some(
      user => user.email.toLowerCase() === formData.email.trim().toLowerCase()
    );

    if (emailExists) {
      setError('An account with this email already exists.');
      return;
    }

    const newUser = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    };

    existingUsers.push(newUser);

    localStorage.setItem('users', JSON.stringify(existingUsers));

    alert('Account created successfully! Please login.');

    navigate('/login');
  }

  return (
    <div className="auth-page">
      <nav className="auth-navbar">
        <Link to="/" className="brand">
          <span className="brand-icon">♡</span>
          NIRBHAYARAKSHA
        </Link>

        <Link to="/login" className="auth-nav-link">
          Login
        </Link>
      </nav>

      <main className="auth-layout signup-layout">
        <section className="auth-welcome">
          <span className="auth-pill">JOIN OUR COMMUNITY</span>
          <h1>Take your first step towards safer journeys.</h1>
          <p>
            Create your account and explore tools designed
            to support your personal safety.
          </p>
          <div className="welcome-decoration">♡</div>
        </section>

        <section className="auth-card">
          <span className="auth-eyebrow">GET STARTED</span>
          <h2>Create your account</h2>
          <p className="auth-description">
            Join NIRBHAYARAKSHA today.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="signup-name">Full Name</label>
            <input
              id="signup-name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <label htmlFor="signup-email">Email Address</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              required
            />

            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              minLength={8}
              required
            />

            {error && <p className="form-error">{error}</p>}

            <button type="submit">Create Account</button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </section>
      </main>

      <Link to="/" className="auth-home">← Back to Home</Link>
    </div>
  );
}

export default Signup;

