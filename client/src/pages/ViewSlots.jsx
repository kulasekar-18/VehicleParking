// frontend/src/pages/ViewSlots.jsx
import React, { useEffect, useState } from "react";
import "./ViewSlots.css"; // Import CSS file

const ViewSlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/slots");
        const data = await res.json();
        setSlots(data);
      } catch (error) {
        console.error("❌ Error fetching slots:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, []);

  if (loading) return <p className="loading">Loading slots...</p>;

  return (
    <div className="view-slots">
      <div className="container">
        <h2 className="title">🅿 Parking Slots Overview</h2>
        {slots.length === 0 ? (
          <p className="no-slots">No slots found.</p>
        ) : (
          <table className="slots-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Booked By</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, index) => (
                <tr key={slot._id} className={index % 2 === 0 ? "even" : "odd"}>
                  <td>{slot.name}</td>
                  <td>{slot.type}</td>
                  <td
                    className={
                      slot.status === "available" ? "status available" : "status booked"
                    }
                  >
                    {slot.status}
                  </td>
                  <td>{slot.bookedBy ? slot.bookedBy.username : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ViewSlots;