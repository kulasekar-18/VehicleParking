import React, { useEffect, useState } from "react";
import styles from "../styles/AddSlot.module.css";

const AddSlot = () => {
  const [slots, setSlots] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("Car");

  const fetchSlots = async () => {
    const res = await fetch("http://localhost:5000/api/admin/slots");
    const data = await res.json();
    setSlots(data);
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const addSlot = async () => {
    if (!name) return alert("Slot name required");

    const res = await fetch("http://localhost:5000/api/admin/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    setName("");
    fetchSlots();
  };

  const deleteSlot = async (id) => {
    if (!window.confirm("Delete slot?")) return;

    const res = await fetch(
      `http://localhost:5000/api/admin/slots/${id}`,
      { method: "DELETE" }
    );

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    fetchSlots();
  };

  return (
    <div className={styles.container}>
      <h2>🅿 Manage Parking Slots</h2>

      {/* Add Slot */}
      <div className={styles.addBox}>
        <input
          placeholder="Slot Name (A1)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Car">Car</option>
          <option value="Bike">Bike</option>
        </select>
        <button onClick={addSlot}>Add Slot</button>
      </div>

      {/* Slot List */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s._id}>
              <td>{s.name}</td>
              <td>{s.type}</td>
              <td>{s.status}</td>
              <td>
                <button onClick={() => deleteSlot(s._id)}>❌ Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AddSlot;