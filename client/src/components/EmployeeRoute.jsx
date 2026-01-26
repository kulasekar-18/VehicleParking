import { Navigate } from "react-router-dom";

const EmployeeRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) return <Navigate to="/login" />;

  if (user.role !== "employee" && user.role !== "admin") {
    return <Navigate to="/" />;
  }

  return children;
};

export default EmployeeRoute;