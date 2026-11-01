import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();

  const savedUser = JSON.parse(
    localStorage.getItem('loggedInUser') || '{}'
  );

  const [profile, setProfile] = useState({
    name: savedUser.name || '',
    email: savedUser.email || '',
    phone: savedUser.phone || '',
    address: savedUser.address || '',
    emergencyInfo: savedUser.emergencyInfo || '',
  });

  const [message, setMessage] = useState('');

  function handleChange(e) {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    const updatedUser = {
      ...savedUser,
      ...profile,
    };

    localStorage.setItem(
      'loggedInUser',
      JSON.stringify(updatedUser)
    );

    // Also update the registered user's profile details
    const users = JSON.parse(
      localStorage.getItem('users') || '[]'
    );

    const updatedUsers = users.map(user =>
      user.email === savedUser.email
        ? { ...user, ...profile }
        : user
    );

    localStorage.setItem('users', JSON.stringify(updatedUsers));

    setMessage('Profile updated successfully! 💜');
  }

  function handleLogout() {
    localStorage.removeItem('loggedInUser');
    navigate('/login');
  }

  return (
    <div className="profile-page">

      <nav className="profile-navbar">
        <Link to="/dashboard" className="profile-logo">
          ♡ NIRBHAYARAKSHA
        </Link>

        <Link to="/dashboard" className="back-dashboard">
          ← Dashboard
        </Link>
      </nav>

      <main className="profile-container">

        <div className="profile-heading">
          <span>YOUR ACCOUNT</span>
          <h1>My Profile</h1>
          <p>Manage your personal information and account details.</p>
        </div>

        <section className="profile-card">

          <div className="profile-avatar">
            👤
          </div>

          <h2>{profile.name || 'Your Name'}</h2>
          <p>{profile.email}</p>

          <form onSubmit={handleSubmit} className="profile-form">

            <div className="profile-field">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="profile-field">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                readOnly
              />
            </div>

            <div className="profile-field">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="profile-field">
              <label>Address</label>
              <textarea
                name="address"
                value={profile.address}
                onChange={handleChange}
                placeholder="Enter your address"
                rows="3"
              />
            </div>

            <div className="profile-field">
              <label>Emergency Information</label>
              <textarea
                name="emergencyInfo"
                value={profile.emergencyInfo}
                onChange={handleChange}
                placeholder="Optional information that may help in an emergency"
                rows="3"
              />
            </div>

            <button type="submit" className="save-profile">
              Save Changes
            </button>

            {message && (
              <p className="profile-message">{message}</p>
            )}

          </form>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </section>

      </main>

      <footer className="profile-footer">
        © 2026 NIRBHAYARAKSHA · Your Safety, Our Priority.
      </footer>

    </div>
  );
}

export default Profile;

