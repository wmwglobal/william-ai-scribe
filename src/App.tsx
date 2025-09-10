import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Personalities from "./pages/Personalities";
import SessionDetail from "./pages/SessionDetail";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NetworkErrorBoundary } from "./components/NetworkErrorBoundary";
import { ErrorProvider } from "./contexts/ErrorContext";

const App = () => {
  return (
    <ErrorProvider>
      <ErrorBoundary>
        <NetworkErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/session/:sessionId" element={<SessionDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/personalities" element={<Personalities />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </NetworkErrorBoundary>
      </ErrorBoundary>
    </ErrorProvider>
  );
};

export default App;
