import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './principal.css';
import logo from '/imagenes/necesidades.png';

// Componentes
import Habitos from './Habitos';
import ProgresoUsuario from './progresoHabitos';
import Logros from './Logros';
import Configuracion from './Configuracion';
import GraficaSensor from './GraficaSensor';

// ======= Import IndexedDB helper =======
import { initDB, sendPost, syncPending } from './indexedDB.js';

const Principal = ({ userId }) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('inicio');
  const [healthTips, setHealthTips] = useState([]);
  const [productivityTips, setProductivityTips] = useState([]);

  // ====== Inicializar IndexedDB ======
  useEffect(() => {
    initDB()
      .then(() => console.log('IndexedDB inicializada correctamente'))
      .catch(err => console.error('Error inicializando IndexedDB:', err));
  }, []);

  // ====== Detectar cuando vuelve la conexión ======
  useEffect(() => {
    const handleOnline = () => {
      console.log('Conexión restaurada. Sincronizando pendientes...');
      syncPending();
    };

    window.addEventListener('online', handleOnline);

    // Intentar sincronizar al iniciar la app
    syncPending();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Datos de ejemplo para recomendaciones
  useEffect(() => {
    setHealthTips([
      { id: 1, title: "Hidratación adecuada", description: "Bebe al menos 8 vasos de agua al día.", category: "Salud", icon: "💧" },
      { id: 2, title: "Descanso nocturno", description: "Duerme 7-8 horas cada noche.", category: "Salud", icon: "😴" },
      { id: 3, title: "Ejercicio diario", description: "Realiza al menos 30 minutos de actividad física.", category: "Salud", icon: "🏃‍♂️" }
    ]);
    setProductivityTips([
      { id: 1, title: "Técnica Pomodoro", description: "Trabaja en intervalos de 25 minutos con descansos de 5 minutos.", category: "Productividad", icon: "⏱️" },
      { id: 2, title: "Lista de tareas", description: "Prioriza tus tareas diarias usando el método ABCDE.", category: "Productividad", icon: "📝" },
      { id: 3, title: "Espacio de trabajo", description: "Mantén tu área de trabajo limpia y ordenada.", category: "Productividad", icon: "🧹" }
    ]);
  }, []);

  // ====== Guardar acción o hábito en IndexedDB ======
  const handleButtonClick = async (data) => {
    try {
      await sendPost({ tipo: 'acciones', data });
      console.log('Acción procesada correctamente');
    } catch (error) {
      console.error('Error guardando en IndexedDB:', error);
    }
  };

  const handleAgregarHabito = async (dataHabito) => {
    try {
      await sendPost({ tipo: 'habitos', data: dataHabito });
      console.log('Hábito procesado correctamente');
    } catch (err) {
      console.error('Error guardando hábito:', err);
    }
  };

  // ====== Renderizado de secciones ======
  const renderSection = () => {
    switch(activeSection) {
      case 'inicio':
        return (
          <div className="dashboard">
            <div className="welcome-banner">
              <h1>Bienvenido a tu Dashboard</h1>
              <p>Aquí encontrarás recomendaciones personalizadas para mejorar tu salud y productividad</p>
            </div>

            <div className="recommendations-section">
              <h2 className="section-title">Recomendaciones de Salud</h2>
              <div className="tips-grid">
                {healthTips.map(tip => (
                  <div key={tip.id} className="tip-card health">
                    <div className="tip-icon">{tip.icon}</div>
                    <h3>{tip.title}</h3>
                    <p>{tip.description}</p>
                    <span className="tip-category">{tip.category}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="recommendations-section">
              <h2 className="section-title">Hábitos Productivos</h2>
              <div className="tips-grid">
                {productivityTips.map(tip => (
                  <div key={tip.id} className="tip-card productivity">
                    <div className="tip-icon">{tip.icon}</div>
                    <h3>{tip.title}</h3>
                    <p>{tip.description}</p>
                    <span className="tip-category">{tip.category}</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              className="btn-save"
              onClick={() => handleButtonClick({ userId, accion: 'click_inicio', fecha: new Date().toISOString() })}
            >
              Guardar Acción
            </button>
          </div>
        );
      case 'habitos':
        return <Habitos userId={userId} handleAgregarHabito={handleAgregarHabito} />;
      case 'progreso':
        return <ProgresoUsuario userId={userId} />;
      case 'logros':
        return <Logros userId={userId} />;
      case 'configuracion':
        return <Configuracion userId={userId} />;
      case 'grafica':
        return <GraficaSensor userId={userId} />;
      default:
        return <div className="dashboard">Selecciona una opción del menú</div>;
    }
  };

  return (
    <div className="principal-container">
      <nav className="navbar">
        <div className="navbar-brand" onClick={() => setActiveSection('inicio')}>
          <img src={logo} alt="Logo" className="navbar-logo" />
          <span className="navbar-title">SMART ROUTINE</span>
        </div>

        <div className="navbar-menu">
          <button className={`nav-link ${activeSection === 'habitos' ? 'active' : ''}`} onClick={() => setActiveSection('habitos')}>Hábitos</button>
          <button className={`nav-link ${activeSection === 'progreso' ? 'active' : ''}`} onClick={() => setActiveSection('progreso')}>Progreso</button>
          <button className={`nav-link ${activeSection === 'logros' ? 'active' : ''}`} onClick={() => setActiveSection('logros')}>Logros</button>
          <button className={`nav-link ${activeSection === 'grafica' ? 'active' : ''}`} onClick={() => setActiveSection('grafica')}>Sensores</button>
          <button className={`nav-link ${activeSection === 'configuracion' ? 'active' : ''}`} onClick={() => setActiveSection('configuracion')}>Configuración</button>
        </div>

        <button
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            navigate('/');
          }}
        >
          Cerrar sesión
        </button>
      </nav>

      <main className="principal-content">
        {renderSection()}
      </main>
    </div>
  );
};

export default Principal;
