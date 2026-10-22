import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { ToastProvider } from "./components/ui/ToastProvider";
import { useSessionStore } from "./features/session/sessionStore";
import { HomePage } from "./pages/HomePage";
import { NewLifePage } from "./pages/NewLifePage";
import { DuelPage } from "./pages/DuelPage";
import { RoomPage } from "./pages/RoomPage";
import { GamePage } from "./pages/GamePage";
import { ComparePage } from "./pages/ComparePage";
import { HistoryPage } from "./pages/HistoryPage";
import { FinalPage } from "./pages/FinalPage";
import { SavesPage } from "./pages/SavesPage";
import { LivesHistoryPage } from "./pages/LivesHistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function SessionBootstrap() {
  const ensureSession = useSessionStore((state) => state.ensureSession);
  useEffect(() => {
    void ensureSession().catch(() => undefined);
  }, [ensureSession]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SessionBootstrap />
        <ScrollToTop />
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/nueva-vida" element={<NewLifePage />} />
            <Route path="/duelo" element={<DuelPage />} />
            <Route path="/sala/:code" element={<RoomPage />} />
            <Route path="/partida/:id" element={<GamePage />} />
            <Route path="/partida/:id/comparar" element={<ComparePage />} />
            <Route path="/partida/:id/historial" element={<HistoryPage />} />
            <Route path="/partida/:id/final" element={<FinalPage />} />
            <Route path="/partidas" element={<SavesPage />} />
            <Route path="/historial" element={<LivesHistoryPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </ToastProvider>
    </BrowserRouter>
  );
}
