import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Onboarding from "./Onboarding";

import Profile from "./Profile";

import SettingsOrganization from "./SettingsOrganization";

import SettingsTeam from "./SettingsTeam";

import TestsNew from "./TestsNew";

import Tests from "./Tests";

import TestDetail from "./TestDetail";

import TestSimulator from "./TestSimulator";

import ApiDocs from "./ApiDocs";

import ResultsDashboard from "./ResultsDashboard";

import PlanManagement from "./PlanManagement";

import AdminQuota from "./AdminQuota";

import Projects from "./Projects";

import Analytics from "./Analytics";

import Unsubscribe from "./Unsubscribe";

import Documentation from "./Documentation";

import DocsInstallationGuide from "./DocsInstallationGuide";

import DocsTroubleshooting from "./DocsTroubleshooting";

import DocsFAQ from "./DocsFAQ";

import TestHistory from "./TestHistory";

import CompareTests from "./CompareTests";

import HistoryAnalytics from "./HistoryAnalytics";

import ExportCenter from "./ExportCenter";

import ExportManagement from "./ExportManagement";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Onboarding: Onboarding,
    
    Profile: Profile,
    
    SettingsOrganization: SettingsOrganization,
    
    SettingsTeam: SettingsTeam,
    
    TestsNew: TestsNew,
    
    Tests: Tests,
    
    TestDetail: TestDetail,
    
    TestSimulator: TestSimulator,
    
    ApiDocs: ApiDocs,
    
    ResultsDashboard: ResultsDashboard,
    
    PlanManagement: PlanManagement,
    
    AdminQuota: AdminQuota,
    
    Projects: Projects,
    
    Analytics: Analytics,
    
    Unsubscribe: Unsubscribe,
    
    Documentation: Documentation,
    
    DocsInstallationGuide: DocsInstallationGuide,
    
    DocsTroubleshooting: DocsTroubleshooting,
    
    DocsFAQ: DocsFAQ,
    
    TestHistory: TestHistory,
    
    CompareTests: CompareTests,
    
    HistoryAnalytics: HistoryAnalytics,
    
    ExportCenter: ExportCenter,
    
    ExportManagement: ExportManagement,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/SettingsOrganization" element={<SettingsOrganization />} />
                
                <Route path="/SettingsTeam" element={<SettingsTeam />} />
                
                <Route path="/TestsNew" element={<TestsNew />} />
                
                <Route path="/Tests" element={<Tests />} />
                
                <Route path="/TestDetail" element={<TestDetail />} />
                
                <Route path="/TestSimulator" element={<TestSimulator />} />
                
                <Route path="/ApiDocs" element={<ApiDocs />} />
                
                <Route path="/ResultsDashboard" element={<ResultsDashboard />} />
                
                <Route path="/PlanManagement" element={<PlanManagement />} />
                
                <Route path="/AdminQuota" element={<AdminQuota />} />
                
                <Route path="/Projects" element={<Projects />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/Unsubscribe" element={<Unsubscribe />} />
                
                <Route path="/Documentation" element={<Documentation />} />
                
                <Route path="/DocsInstallationGuide" element={<DocsInstallationGuide />} />
                
                <Route path="/DocsTroubleshooting" element={<DocsTroubleshooting />} />
                
                <Route path="/DocsFAQ" element={<DocsFAQ />} />
                
                <Route path="/TestHistory" element={<TestHistory />} />
                
                <Route path="/CompareTests" element={<CompareTests />} />
                
                <Route path="/HistoryAnalytics" element={<HistoryAnalytics />} />
                
                <Route path="/ExportCenter" element={<ExportCenter />} />
                
                <Route path="/ExportManagement" element={<ExportManagement />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}