import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const users = JSON.parse(
      localStorage.getItem('users') || '[]'
    );

    const user = users.find(
      user =>
        user.email === email.trim().toLowerCase() &&
        user.password === password
    );

    if (!user) {
      setError('Invalid email or password. Please try again.');
      return;
    }

    localStorage.setItem(
      'loggedInUser',
      JSON.stringify({
        name: user.name,
        email: user.email,
      })
    );

    navigate('/dashboard');
  }

  return (
    <div className="auth-page">
      <nav className="auth-navbar">
        <Link to="/" className="brand">
          <span className="brand-icon">♡</span>
          NIRBHAYARAKSHA
        </Link>

        <Link to="/signup" className="auth-nav-link">
          Create Account
        </Link>
      </nav>

      <main className="auth-layout">
        <section className="auth-welcome">
          <span className="auth-pill">WELCOME BACK</span>
          <h1>Your safety is just a login away.</h1>
          <p>
            Stay connected, stay protected, and continue
            your journey with confidence.
          </p>
          <div className="welcome-decoration">♡</div>
        </section>

        <section className="auth-card">
          <span className="auth-eyebrow">WELCOME BACK</span>
          <h2>Login to your account</h2>
          <p className="auth-description">
            Enter your details to continue.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="form-error">{error}</p>}

            <button type="submit">Login</button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>
        </section>
      </main>

      <Link to="/" className="auth-home">← Back to Home</Link>
    </div>
  );
}

export default Login;

