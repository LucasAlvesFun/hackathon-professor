import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ClassroomProvider } from './contexts/ClassroomContext'
import { NotificationProvider } from './contexts/NotificationContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ClassroomProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </ClassroomProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
