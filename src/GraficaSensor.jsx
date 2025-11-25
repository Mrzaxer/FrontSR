import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, ReferenceLine
} from 'recharts';
import './graficaSensor.css';

const SENSOR_CONFIG = {
  cardiaco: {
    color: '#FF6B6B',
    name: 'Ritmo Cardíaco',
    unit: 'bpm',
    icon: '❤️',
    activities: {
      running: {
        name: 'Corriendo',
        context: 'Datos obtenidos durante carrera de intensidad media',
        range: [120, 160]
      },
      cycling: {
        name: 'Ciclismo',
        context: 'Datos capturados durante sesión de ciclismo',
        range: [110, 150]
      },
      resting: {
        name: 'Reposo',
        context: 'Datos tomados en estado de reposo',
        range: [60, 100]
      }
    }
  },
  luz: {
    color: '#4ECDC4',
    name: 'Nivel de Luz',
    unit: 'lux',
    icon: '💡',
    activities: {
      working: {
        name: 'Trabajando',
        context: 'Niveles de luz durante horas de trabajo',
        optimal: [300, 500]
      },
      reading: {
        name: 'Leyendo',
        context: 'Iluminación durante sesión de lectura',
        optimal: [500, 800]
      },
      sleeping: {
        name: 'Durmiendo',
        context: 'Niveles de luz en el dormitorio',
        optimal: [0, 50]
      }
    }
  },
  temperatura: {
    color: '#FFA07A',
    name: 'Temperatura',
    unit: '°C',
    icon: '🌡️',
    activities: {
      working: {
        name: 'Trabajando',
        context: 'Temperatura en el área de trabajo',
        optimal: [20, 24]
      },
      exercising: {
        name: 'Ejercitando',
        context: 'Temperatura durante sesión de ejercicio',
        optimal: [18, 22]
      },
      sleeping: {
        name: 'Durmiendo',
        context: 'Temperatura en el dormitorio',
        optimal: [16, 20]
      }
    }
  }
};

const GraficaSensor = () => {
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentActivity, setCurrentActivity] = useState({
    cardiaco: 'running',
    luz: 'working',
    temperatura: 'working'
  });

  // Función para generar recomendaciones basadas en la actividad
  const generarRecomendaciones = (tipo, datos, actividad) => {
    if (!datos || datos.length === 0) return [];
    
    const valores = datos.map(d => d.valor);
    const avg = valores.reduce((a, b) => a + b, 0) / valores.length;
    const activityConfig = SENSOR_CONFIG[tipo].activities[actividad];
    
    const recomendaciones = [];
    
    switch(tipo) {
      case 'cardiaco':
        if (avg < activityConfig.range[0]) {
          recomendaciones.push(`Durante ${activityConfig.name.toLowerCase()}, tu ritmo cardíaco promedio fue bajo (${avg.toFixed(0)} bpm).`);
          recomendaciones.push("Considera aumentar la intensidad de tu ejercicio para mejores resultados cardiovasculares.");
          if (actividad === 'resting') {
            recomendaciones.push("Si estás en reposo y tu ritmo cardíaco es bajo, consulta a un médico para un chequeo.");
          }
        } else if (avg > activityConfig.range[1]) {
          recomendaciones.push(`Durante ${activityConfig.name.toLowerCase()}, tu ritmo cardíaco promedio fue alto (${avg.toFixed(0)} bpm).`);
          recomendaciones.push("Considera reducir la intensidad o descansar si te sientes fatigado.");
          if (actividad === 'resting') {
            recomendaciones.push("Un ritmo cardíaco elevado en reposo puede indicar estrés. Practica técnicas de relajación.");
          }
        } else {
          recomendaciones.push(`¡Buen trabajo! Tu ritmo cardíaco durante ${activityConfig.name.toLowerCase()} está en el rango óptimo.`);
        }
        break;
        
      case 'luz':
        if (avg < activityConfig.optimal[0]) {
          recomendaciones.push(`La iluminación durante ${activityConfig.name.toLowerCase()} es baja (${avg.toFixed(0)} lux).`);
          recomendaciones.push("Aumenta la luz para reducir fatiga visual y mejorar productividad.");
        } else if (avg > activityConfig.optimal[1]) {
          recomendaciones.push(`La iluminación durante ${activityConfig.name.toLowerCase()} es intensa (${avg.toFixed(0)} lux).`);
          recomendaciones.push("Reduce la luz para mayor comodidad y ahorro energético.");
        } else {
          recomendaciones.push(`La iluminación durante ${activityConfig.name.toLowerCase()} es ideal.`);
        }
        break;
        
      case 'temperatura':
        if (avg < activityConfig.optimal[0]) {
          recomendaciones.push(`La temperatura durante ${activityConfig.name.toLowerCase()} es baja (${avg.toFixed(1)}°C).`);
          recomendaciones.push("Considera abrigarte más o ajustar la calefacción para mayor confort.");
        } else if (avg > activityConfig.optimal[1]) {
          recomendaciones.push(`La temperatura durante ${activityConfig.name.toLowerCase()} es alta (${avg.toFixed(1)}°C).`);
          recomendaciones.push("Considera ventilación o ajustar el aire acondicionado para mayor comodidad.");
        } else {
          recomendaciones.push(`La temperatura durante ${activityConfig.name.toLowerCase()} es perfecta.`);
        }
        break;
        
      default:
        break;
    }
    
    return recomendaciones.length > 0 ? recomendaciones : ["Los datos se encuentran dentro de los rangos normales."];
  };

  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const storedUserId = localStorage.getItem('userId');
        const token = localStorage.getItem('authToken');

        if (!storedUserId || !token) {
          throw new Error('Se requieren credenciales para acceder a los datos');
        }

        const url = `http://localhost:3000/api/sensores/${storedUserId}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const transformedData = data.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            valor: Number(item.valor)
          }));
          setSensorData(transformedData);
        } else {
          setSensorData([]);
        }
      } catch (error) {
        console.error('Error al obtener datos:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSensorData();
    
    // Opcional: Configurar polling para actualización automática
    const interval = setInterval(fetchSensorData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Función para calcular estadísticas
  const calcularEstadisticas = (datos) => {
    if (!datos || datos.length === 0) return null;
    
    const valores = datos.map(d => d.valor);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const avg = (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2);
    
    return { min, max, avg };
  };

  // Separar y procesar datos por tipo de sensor
  const dataPorTipo = Object.keys(SENSOR_CONFIG).reduce((acc, tipo) => {
    acc[tipo] = {
      ...SENSOR_CONFIG[tipo],
      data: sensorData.filter(d => d.tipo_sensor === tipo),
      recomendaciones: generarRecomendaciones(tipo, sensorData.filter(d => d.tipo_sensor === tipo), currentActivity[tipo])
    };
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="grafica-container loading">
        <div className="spinner"></div>
        <p>Cargando datos de sensores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grafica-container error">
        <div className="error-content">
          <h3>Error al cargar los datos</h3>
          <p>{error}</p>
          <button 
            className="retry-btn"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grafica-container">
      <div className="grafica-header">
        <h2 className="grafica-title">Monitoreo de Sensores</h2>
        <p className="grafica-subtitle">Datos por actividad y recomendaciones personalizadas</p>
      </div>

      <div className="graficas-grid">
        {Object.entries(dataPorTipo).map(([tipo, config]) => {
          const stats = calcularEstadisticas(config.data);
          const actividad = currentActivity[tipo];
          const actividadConfig = config.activities[actividad];
          
          return (
            <div key={tipo} className="grafica-card">
              <div className="sensor-header">
                <h3 className="sensor-title">
                  <span className="sensor-icon">{config.icon}</span> 
                  {config.name}
                  <span className="activity-badge">
                    {actividadConfig.name}
                  </span>
                  <span className={`sensor-status ${config.data.length > 0 ? 'active' : 'inactive'}`}>
                    {config.data.length > 0 ? 'Activo' : 'Inactivo'}
                  </span>
                </h3>
                <div className="data-context">
                  <small>{actividadConfig.context}</small>
                </div>
              </div>

              {config.data.length > 0 ? (
                <>
                  <div className="activity-selector">
                    <label>Actividad:</label>
                    <select 
                      value={actividad}
                      onChange={(e) => setCurrentActivity({...currentActivity, [tipo]: e.target.value})}
                    >
                      {Object.entries(config.activities).map(([key, act]) => (
                        <option key={key} value={key}>{act.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={config.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="timestamp" 
                          tick={{ fontSize: 12 }}
                          tickMargin={10}
                        />
                        <YAxis 
                          unit={config.unit}
                          tick={{ fontSize: 12 }}
                          tickMargin={10}
                        />
                        {actividadConfig.range && (
                          <>
                            <ReferenceLine 
                              y={actividadConfig.range[0]} 
                              stroke="#888" 
                              strokeDasharray="3 3" 
                              label={`Mín ${actividadConfig.range[0]}`}
                            />
                            <ReferenceLine 
                              y={actividadConfig.range[1]} 
                              stroke="#888" 
                              strokeDasharray="3 3" 
                              label={`Máx ${actividadConfig.range[1]}`}
                            />
                          </>
                        )}
                        {actividadConfig.optimal && (
                          <>
                            <ReferenceLine 
                              y={actividadConfig.optimal[0]} 
                              stroke="#4CAF50" 
                              strokeDasharray="3 3" 
                              label={`Óptimo ${actividadConfig.optimal[0]}`}
                            />
                            <ReferenceLine 
                              y={actividadConfig.optimal[1]} 
                              stroke="#4CAF50" 
                              strokeDasharray="3 3" 
                              label={`Óptimo ${actividadConfig.optimal[1]}`}
                            />
                          </>
                        )}
                        <Tooltip 
                          formatter={(value) => [`${value} ${config.unit}`, config.name]}
                          labelFormatter={(label) => `Hora: ${label}`}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="valor" 
                          stroke={config.color} 
                          fill={`${config.color}20`} 
                          strokeWidth={2}
                          name={`${config.name} (${config.unit})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {stats && (
                    <div className="sensor-stats">
                      <div className="stat-item">
                        <span className="stat-label">Mínimo:</span>
                        <span className="stat-value">{stats.min} {config.unit}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Promedio:</span>
                        <span className="stat-value">{stats.avg} {config.unit}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Máximo:</span>
                        <span className="stat-value">{stats.max} {config.unit}</span>
                      </div>
                    </div>
                  )}

                  <div className="recomendaciones-container">
                    <h4>Recomendaciones:</h4>
                    {config.recomendaciones.length > 0 ? (
                      <ul className="recomendaciones-list">
                        {config.recomendaciones.map((rec, index) => (
                          <li key={index} className="recomendacion-item">
                            {rec}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-recomendaciones">
                        No hay recomendaciones específicas para estos datos.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="no-data">
                  <p>No hay datos disponibles</p>
                  <small>El sensor parece estar desconectado o no ha enviado datos</small>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GraficaSensor;