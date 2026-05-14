import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { Home } from "./routes/Home";
import { VerifyLocal } from "./routes/VerifyLocal";
import { VerifyPublic } from "./routes/VerifyPublic";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/v/:id" element={<VerifyPublic />} />
        <Route path="/verify" element={<VerifyLocal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
