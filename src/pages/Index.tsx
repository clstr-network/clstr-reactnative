import { Navigate } from "react-router-dom";

const Index = () => {
  // This route now defers to the production home feed to avoid demo-only UI.
  return <Navigate to="/home" replace />;
};

export default Index;
