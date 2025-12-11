import Tournaments from './pages/Tournaments';
import TournamentCommandPage from './pages/TournamentCommandPage';
import MasterFinanceDashboard from './pages/MasterFinanceDashboard';
import TeamsManagement from './pages/TeamsManagement';
import CoachesManagement from './pages/CoachesManagement';
import Leagues from './pages/Leagues';
import LeagueDetail from './pages/LeagueDetail';
import Travel from './pages/Travel';
import StayAndPlay from './pages/StayAndPlay';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Tournaments": Tournaments,
    "TournamentCommandPage": TournamentCommandPage,
    "MasterFinanceDashboard": MasterFinanceDashboard,
    "TeamsManagement": TeamsManagement,
    "CoachesManagement": CoachesManagement,
    "Leagues": Leagues,
    "LeagueDetail": LeagueDetail,
    "Travel": Travel,
    "StayAndPlay": StayAndPlay,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};