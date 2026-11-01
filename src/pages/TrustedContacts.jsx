import React, { useState, useEffect } from "react";
import "./TrustedContacts.css";

function TrustedContacts() {

  // Load saved contacts from localStorage
  const [contacts, setContacts] = useState(() => {
    const savedContacts = localStorage.getItem("trustedContacts");
    return savedContacts ? JSON.parse(savedContacts) : [];
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    relationship: "",
  });

  const [editIndex, setEditIndex] = useState(null);

  // Save contacts whenever the list changes
  useEffect(() => {
    localStorage.setItem("trustedContacts", JSON.stringify(contacts));
  }, [contacts]);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Add or update contact
  const handleSubmit = (e) => {
    e.preventDefault();

    if (editIndex !== null) {
      const updatedContacts = [...contacts];
      updatedContacts[editIndex] = formData;

      setContacts(updatedContacts);
      setEditIndex(null);
    } else {
      setContacts([...contacts, formData]);
    }

    setFormData({
      name: "",
      phone: "",
      relationship: "",
    });
  };

  // Edit contact
  const handleEdit = (index) => {
    setFormData({ ...contacts[index] });
    setEditIndex(index);
  };

  // Delete contact
  const handleDelete = (index) => {
    const updatedContacts = contacts.filter(
      (_, i) => i !== index
    );

    setContacts(updatedContacts);

    if (editIndex === index) {
      setEditIndex(null);
      setFormData({
        name: "",
        phone: "",
        relationship: "",
      });
    } else if (editIndex !== null && editIndex > index) {
      setEditIndex(editIndex - 1);
    }
  };

  return (
    <div className="trusted-page">
      <div className="trusted-container">

        <div className="trusted-header">
          <h1>Trusted Contacts</h1>
          <p>
            Your safety circle. Add people you trust
            who can be contacted during emergencies.
          </p>
        </div>

        <div className="trusted-content">

          {/* ADD CONTACT FORM */}
          <div className="contact-form-card">

            <h2>
              {editIndex !== null
                ? "Edit Contact"
                : "Add New Contact"}
            </h2>

            <form onSubmit={handleSubmit}>

              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter contact name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
                pattern="[0-9]{10}"
                title="Enter a valid 10-digit phone number"
                required
              />

              <label>Relationship</label>
              <select
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
                required
              >
                <option value="">Select relationship</option>
                <option value="Family">Family</option>
                <option value="Friend">Friend</option>
                <option value="Relative">Relative</option>
                <option value="Colleague">Colleague</option>
                <option value="Other">Other</option>
              </select>

              <button
                type="submit"
                className="save-contact-btn"
              >
                {editIndex !== null
                  ? "Update Contact"
                  : "Save Contact"}
              </button>

            </form>
          </div>

          {/* DISPLAY CONTACTS */}
          <div className="contacts-list-card">

            <h2>My Emergency Circle</h2>

            <p className="contacts-subtitle">
              People who matter when every second counts.
            </p>

            {contacts.length === 0 ? (

              <div className="empty-contacts">
                <div className="empty-icon">♡</div>
                <h3>No contacts added yet</h3>
                <p>
                  Add your trusted people to build
                  your safety circle.
                </p>
              </div>

            ) : (

              <div className="contacts-list">

                {contacts.map((contact, index) => (

                  <div className="contact-item" key={index}>

                    <div className="contact-avatar">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="contact-details">
                      <h3>{contact.name}</h3>
                      <p>{contact.phone}</p>
                      <span>{contact.relationship}</span>
                    </div>

                    <div className="contact-actions">

                      <button
                        type="button"
                        onClick={() => handleEdit(index)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>
      </div>
    </div>
  );
}

export default TrustedContacts;

