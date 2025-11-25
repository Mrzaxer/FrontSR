import { useNavigate } from 'react-router-dom';
import styles from './Inicio.module.css';
import logo from '/imagenes/iconn.png';
import logoBienvenida from '/imagenes/free.png';
import fondo from '/imagenes/images.jpeg';

const Inicio = () => {
  const navigate = useNavigate();

  const handleRegistrar = () => {
    navigate('/registro');
  };

  const handleAcceder = () => {
    navigate('/login');
  };

  return (
    <div className={styles.container} style={{ backgroundImage: `url(${fondo})` }}>
      <nav className={styles.navbar}>
        <div className={styles.navbarLogo}>
          <h1 className={styles.navbarTitulo}>SMART ROUTINE</h1>
        </div>
      </nav>

      <div className={styles.contenidoPrincipal}>
        <div className={styles.cajaInformacion}>
          <div className={styles.contenidoTexto}>
            <p>"Bienvenido"</p>
            <p>"Haz que los pequeños hábitos y las grandes metas sean alcanzables"</p>
          </div>
          <div className={styles.contenidoImagen}>
            <img 
              src={logoBienvenida} 
              alt="Salud Mental" 
              className={styles.logoBienvenida}
            />
          </div>
          <div className={styles.botonesContainer}>
            <button className={styles.botonAcceder} onClick={handleAcceder}>
              Acceder
            </button>
            <button className={styles.botonRegistrar} onClick={handleRegistrar}>
              Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inicio;