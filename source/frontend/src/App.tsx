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
import { HowItWorks } from "./routes/HowItWorks";
import { MeetB3 } from "./routes/MeetB3";
import { RealSessions } from "./routes/RealSessions";
import { VerifyLocal } from "./routes/VerifyLocal";
import { VerifyPublic } from "./routes/VerifyPublic";

/**
 * Routing.
 *
 * `/` (landing v5), `/dashboard` (dev dashboard), `/company/dashboard`
 * and `/directory` (company dashboard) render OUTSIDE <Layout> on
 * purpose: the landing owns its own Constellation, topbar and footer;
 * the dashboards own the full app shell (sticky TopBar + Sidebar — see
 * design_handoff_dev / design_handoff_empresa). Every other route is
 * nested under a <Layout /> parent route, which provides the global
 * Constellation, floating Locale/Theme toggle box and width
 * constraint.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/company/dashboard" element={<CompanyDashboardPage />} />
      <Route path="/directory" element={<Directory />} />
      <Route path="/accounts/:account_id/contact" element={<AccountContact />} />
      <Route path="/v/:id" element={<VerifyPublic />} />
      <Route path="/companies/new" element={<CompaniesNew />} />
      <Route path="/empresa/cadastro" element={<CompaniesNew />} />
      <Route path="/sessions/company/new" element={<CompanyLogin />} />
      <Route path="/empresa/entrar" element={<CompanyLogin />} />

      <Route element={<Layout />}>
        <Route path="/compromisso" element={<Compromisso />} />
        <Route path="/como-funciona" element={<HowItWorks />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/sessoes-reais" element={<RealSessions />} />
        <Route path="/real-sessions" element={<RealSessions />} />
        <Route path="/b3" element={<MeetB3 />} />
        <Route path="/b3h31d" element={<MeetB3 />} />
        <Route path="/verify" element={<VerifyLocal />} />
        <Route path="/dashboard/companies/:company" element={<CompanyMessages />} />
        <Route path="/sessions/company/verify" element={<CompanyVerify />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
