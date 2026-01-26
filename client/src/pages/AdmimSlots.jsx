import React, { useEffect, useState } from "react";
import styles from "../styles/AdminSlots.module.css";

const API = "http://localhost:5000/api/admin/slots";

const AdminSlots = () => {
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ name: "", type: "Car" });
  const [editingId, setEditingId] = useState(null);

  // 🔄 Load slots
  const fetchSlots = async () => {
    const res = await fetch(API);
    const data = await res.json();
    setSlots(data);
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  // 📝 Handle input
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ➕ Add or ✏️ Update slot
  const handleSubmit = async (e) => {
    e.preventDefault();

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `${API}/${editingId}` : API;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({ name: "", type: "Car" });
    setEditingId(null);
    fetchSlots();
  };

  // ✏️ Edit slot
  const handleEdit = (slot) => {
    setEditingId(slot._id);
    setForm({ name: slot.name, type: slot.type });
  };

  // ❌ Delete slot
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this slot?")) return;

    await fetch(`${API}/${id}`, { method: "DELETE" });
    fetchSlots();
  };

  return (
    <div className={styles.container}>
      <h2>🅿 Admin Slot Management</h2>

      {/* Add / Edit Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          name="name"
          placeholder="Slot Name (A1, B2...)"
          value={form.name}
          onChange={handleChange}
          required
        />

        <select name="type" value={form.type} onChange={handleChange}>
          <option value="Car">Car</option>
          <option value="Bike">Bike</option>
        </select>

        <button type="submit">
          {editingId ? "Update Slot" : "Add Slot"}
        </button>
      </form>

      {/* Slot Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Slot</th>
            <th>Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot._id}>
              <td>{slot.name}</td>
              <td>{slot.type}</td>
              <td>{slot.status}</td>
              <td>
                <button onClick={() => handleEdit(slot)}>✏️</button>
                <button
                  onClick={() => handleDelete(slot._id)}
                  disabled={slot.status === "booked"}
                >
                  ❌
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminSlots;