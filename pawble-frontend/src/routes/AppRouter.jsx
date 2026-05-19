import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import ModeSelectPage from '../pages/ModeSelectPage.jsx';
import HomePage from '../pages/HomePage.jsx';
import AdoptionPage from '../pages/AdoptionPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import PetFormPage from '../pages/PetFormPage.jsx';
import FavoritesPage from '../pages/FavoritesPage.jsx';
import MatchesPage from '../pages/MatchesPage.jsx';
import ConversationPage from '../pages/ConversationPage.jsx';
import AdminPage from '../pages/AdminPage.jsx';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<ModeSelectPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/adoption" element={<AdoptionPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/pet/new" element={<PetFormPage />} />
        <Route path="/pet/:petId/edit" element={<PetFormPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/conversation/:otherId" element={<ConversationPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
