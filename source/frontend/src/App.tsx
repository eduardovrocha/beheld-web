import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { AccountContact } from "./routes/AccountContact";
import { CompaniesNew } from "./routes/CompaniesNew";
import { CompanyLogin } from "./routes/CompanyLogin";
import { CompanyVerify } from "./routes/CompanyVerify";
import { CompanyDashboardPage } from "./routes/company/Dashboard";
import { CompanyMessages } from "./routes/CompanyMessages";
import { Compromisso } from "./routes/Compromisso";
import { Dashboard } from "./routes/Dashboard";
import { Directory } from "./routes/Directory";
import { Home } from "./routes/Home";
import { VerifyLocal } from "./routes/VerifyLocal";
import { VerifyPublic } from "./routes/VerifyPublic";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/compromisso" element={<Compromisso />} />
        <Route path="/v/:id" element={<VerifyPublic />} />
        <Route path="/verify" element={<VerifyLocal />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/companies/:company" element={<CompanyMessages />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/company/dashboard" element={<CompanyDashboardPage />} />
        <Route path="/companies/new" element={<CompaniesNew />} />
        <Route path="/sessions/company/new"    element={<CompanyLogin />} />
        <Route path="/sessions/company/verify" element={<CompanyVerify />} />
        <Route path="/accounts/:account_id/contact" element={<AccountContact />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
