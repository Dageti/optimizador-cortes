import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [trabajos, setTrabajos] = useState(() => {
    const guardados = localStorage.getItem('trabajos_cortes_v2');
    return guardados ? JSON.parse(guardados) : [];
  });
  const [vista, setVista] = useState('lista'); 
  const [trabajoActual, setTrabajoActual] = useState({
    id: null, nombre: '', planchaAncho: 244, planchaAlto: 122, margen: 0.5, cortes: [], resultados: null
  });

  useEffect(() => {
    localStorage.setItem('trabajos_cortes_v2', JSON.stringify(trabajos));
  }, [trabajos]);

  // --- ALGORITMO DE BIN PACKING 2D ---
  class Nodo {
    constructor(x, y, w, h) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.usado = false;
      this.derecha = null;
      this.abajo = null;
    }
  }

  const buscarNodo = (nodoRaiz, w, h) => {
    if (nodoRaiz.usado) {
      let nodo = buscarNodo(nodoRaiz.derecha, w, h);
      if (nodo) return nodo;
      return buscarNodo(nodoRaiz.abajo, w, h);
    } else if (w <= nodoRaiz.w && h <= nodoRaiz.h) {
      return nodoRaiz;
    }
    return null;
  };

  const dividirNodo = (nodo, w, h) => {
    nodo.usado = true;
    nodo.abajo = new Nodo(nodo.x, nodo.y + h, nodo.w, nodo.h - h);
    nodo.derecha = new Nodo(nodo.x + w, nodo.y, nodo.w - w, h);
    return nodo;
  };

  const calcularResultadosFisicos = () => {
    const pW = parseFloat(trabajoActual.planchaAncho);
    const pH = parseFloat(trabajoActual.planchaAlto);
    const margen = parseFloat(trabajoActual.margen) || 0;

    if (!pW || !pH) return alert("Ingresa las dimensiones de la plancha base.");
    if (trabajoActual.cortes.length === 0) return alert("Agrega al menos una pieza para cortar.");

    let piezasAcomodar = [];
    trabajoActual.cortes.forEach((corte, index) => {
      if (!corte.ancho || !corte.alto || !corte.cantidad) return;
      
      // Aquí se suma el margen de seguridad para el cálculo
      const wReal = parseFloat(corte.ancho) + margen;
      const hReal = parseFloat(corte.alto) + margen;
      const qty = parseInt(corte.cantidad);

      for (let i = 0; i < qty; i++) {
        piezasAcomodar.push({ 
          id: `${index}-${i}`, 
          w: wReal, 
          h: hReal, 
          wOriginal: parseFloat(corte.ancho), 
          hOriginal: parseFloat(corte.alto) 
        });
      }
    });

    piezasAcomodar.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    let planchasUtilizadas = [];
    let areaPuraUsada = 0;

    piezasAcomodar.forEach(pieza => {
      let colocada = false;

      for (let plancha of planchasUtilizadas) {
        let nodo = buscarNodo(plancha.raiz, pieza.w, pieza.h);
        if (nodo) {
          dividirNodo(nodo, pieza.w, pieza.h);
          plancha.piezasColocadas.push({ ...pieza, x: nodo.x, y: nodo.y, rotada: false });
          colocada = true; break;
        }
        nodo = buscarNodo(plancha.raiz, pieza.h, pieza.w);
        if (nodo) {
          dividirNodo(nodo, pieza.h, pieza.w);
          plancha.piezasColocadas.push({ ...pieza, x: nodo.x, y: nodo.y, rotada: true });
          colocada = true; break;
        }
      }

      if (!colocada) {
        let nuevaPlancha = { raiz: new Nodo(0, 0, pW, pH), piezasColocadas: [] };
        let nodo = buscarNodo(nuevaPlancha.raiz, pieza.w, pieza.h);
        if (nodo) {
          dividirNodo(nodo, pieza.w, pieza.h);
          nuevaPlancha.piezasColocadas.push({ ...pieza, x: nodo.x, y: nodo.y, rotada: false });
          planchasUtilizadas.push(nuevaPlancha);
        } else {
          nodo = buscarNodo(nuevaPlancha.raiz, pieza.h, pieza.w);
          if (nodo) {
             dividirNodo(nodo, pieza.h, pieza.w);
             nuevaPlancha.piezasColocadas.push({ ...pieza, x: nodo.x, y: nodo.y, rotada: true });
             planchasUtilizadas.push(nuevaPlancha);
          } else {
             alert(`La pieza de ${pieza.wOriginal}x${pieza.hOriginal} (con margen incluido) es más grande que la plancha misma.`);
             return;
          }
        }
      }
      areaPuraUsada += (pieza.wOriginal * pieza.hOriginal);
    });

    const areaTotalPlanchas = planchasUtilizadas.length * pW * pH;
    const porcentaje = planchasUtilizadas.length > 0 ? ((areaPuraUsada / areaTotalPlanchas) * 100).toFixed(2) : 0;

    setTrabajoActual({
      ...trabajoActual,
      resultados: { planchasNecesarias: planchasUtilizadas.length, porcentajeUso: porcentaje, mapaPlanchas: planchasUtilizadas }
    });
  };

  // --- MANEJO DE ESTADOS ---
  const guardarTrabajo = () => {
    if (!trabajoActual.nombre) return alert("Ponle un nombre al trabajo");
    if (trabajoActual.id) {
      setTrabajos(trabajos.map(t => t.id === trabajoActual.id ? trabajoActual : t));
    } else {
      setTrabajos([...trabajos, { ...trabajoActual, id: Date.now() }]);
    }
    setVista('lista');
  };

  const actualizarCorte = (index, campo, valor) => {
    const nuevos = [...trabajoActual.cortes];
    nuevos[index][campo] = valor;
    setTrabajoActual({ ...trabajoActual, cortes: nuevos });
  };

  const eliminarTrabajo = (id) => setTrabajos(trabajos.filter(t => t.id !== id));

  // --- RENDERIZADO VISTA LISTA ---
  if (vista === 'lista') {
    return (
      <div className="contenedor">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '30px'}}>
          <h1>Mis Trabajos de Corte</h1>
          <button className="btn-success" onClick={() => { setTrabajoActual({ id: null, nombre: '', planchaAncho: 244, planchaAlto: 122, margen: 0.5, cortes: [], resultados: null }); setVista('editor'); }}>
            + Nuevo Trabajo
          </button>
        </div>
        
        <div style={{display: 'grid', gap: '15px'}}>
          {trabajos.map(t => (
            <div key={t.id} style={{background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems:'center'}}>
              <div>
                <h3 style={{margin: '0 0 5px 0'}}>{t.nombre}</h3>
                <span style={{color: '#64748b'}}>Material: {t.planchaAncho}x{t.planchaAlto} cm | Planchas: {t.resultados?.planchasNecesarias || 0}</span>
              </div>
              <div style={{display:'flex', gap:'10px'}}>
                <button className="btn-outline" onClick={() => { setTrabajoActual(t); setVista('editor'); }}>Abrir</button>
                <button className="btn-danger" onClick={() => eliminarTrabajo(t.id)}>Borrar</button>
              </div>
            </div>
          ))}
          {trabajos.length === 0 && <p style={{textAlign:'center', color:'#64748b'}}>No tienes trabajos guardados aún.</p>}
        </div>
      </div>
    );
  }

  // Ancho base para dibujar la plancha en pantalla
  const anchoMaximoDibujo = 700; 
  const escala = trabajoActual.planchaAncho ? anchoMaximoDibujo / trabajoActual.planchaAncho : 1;

  // --- RENDERIZADO VISTA EDITOR (DASHBOARD) ---
  return (
    <div className="contenedor">
      <button className="btn-outline" style={{marginBottom: '20px'}} onClick={() => setVista('lista')}>&larr; Volver a Mis Trabajos</button>
      
      <div className="dashboard">
        {/* COLUMNA IZQUIERDA: INPUTS */}
        <div className="columna-inputs">
          <h2>{trabajoActual.id ? 'Editar Trabajo' : 'Nuevo Trabajo'}</h2>
          
          <div className="grupo-input">
            <label>Nombre del Proyecto</label>
            <input value={trabajoActual.nombre} onChange={e => setTrabajoActual({...trabajoActual, nombre: e.target.value})} placeholder="Ej. Mueble de Cocina" />
          </div>

          <h3 style={{marginTop:'25px', marginBottom:'15px', borderBottom:'1px solid #e2e8f0', paddingBottom:'10px'}}>Material Base</h3>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
            <div className="grupo-input">
              <label>Ancho (cm)</label>
              <input type="number" value={trabajoActual.planchaAncho} onChange={e => setTrabajoActual({...trabajoActual, planchaAncho: e.target.value})} />
            </div>
            <div className="grupo-input">
              <label>Alto (cm)</label>
              <input type="number" value={trabajoActual.planchaAlto} onChange={e => setTrabajoActual({...trabajoActual, planchaAlto: e.target.value})} />
            </div>
          </div>
          
          <div className="grupo-input">
            <label>Margen / Grosor de Sierra (cm)</label>
            <input type="number" step="0.1" value={trabajoActual.margen} onChange={e => setTrabajoActual({...trabajoActual, margen: e.target.value})} />
          </div>

          <h3 style={{marginTop:'25px', marginBottom:'15px', borderBottom:'1px solid #e2e8f0', paddingBottom:'10px'}}>Piezas a Cortar</h3>
          {trabajoActual.cortes.map((corte, i) => (
            <div key={i} className="fila-corte">
              <input type="number" placeholder="Ancho" value={corte.ancho} onChange={e => actualizarCorte(i, 'ancho', e.target.value)} />
              <input type="number" placeholder="Alto" value={corte.alto} onChange={e => actualizarCorte(i, 'alto', e.target.value)} />
              <input type="number" placeholder="Cant." value={corte.cantidad} onChange={e => actualizarCorte(i, 'cantidad', e.target.value)} />
              <button className="btn-danger" onClick={() => setTrabajoActual({...trabajoActual, cortes: trabajoActual.cortes.filter((_, idx) => idx !== i)})}>X</button>
            </div>
          ))}
          
          <button className="btn-outline" style={{width: '100%', marginTop:'10px'}} onClick={() => setTrabajoActual({...trabajoActual, cortes: [...trabajoActual.cortes, { ancho: '', alto: '', cantidad: 1 }]})}>
            + Agregar Pieza
          </button>

          <button className="btn-primary" onClick={calcularResultadosFisicos}>Calcular Cortes</button>
          <button className="btn-success" style={{width: '100%'}} onClick={guardarTrabajo}>Guardar Trabajo</button>
        </div>

        {/* COLUMNA DERECHA: RESULTADOS VISUALES */}
        <div className="columna-resultados">
          <h2>Resultados</h2>
          
          {!trabajoActual.resultados ? (
             <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'80%', color:'#94a3b8'}}>
                <p>Ingresa tus piezas y haz clic en "Calcular Cortes" para ver el mapa aquí.</p>
             </div>
          ) : (
            <>
              <div className="tarjetas-resumen">
                <div className="tarjeta">
                  <span>Planchas Necesarias</span>
                  <strong>{trabajoActual.resultados.planchasNecesarias}</strong>
                </div>
                <div className="tarjeta">
                  <span>Aprovechamiento</span>
                  <strong>{trabajoActual.resultados.porcentajeUso}%</strong>
                </div>
              </div>

              <h4>Mapa de Cortes</h4>
              <p style={{fontSize:'0.85rem', color:'#64748b', marginBottom:'20px'}}>
                * La línea punteada indica el espacio reservado (incluyendo el margen de {trabajoActual.margen}cm). El cuadro sólido es la pieza final.
              </p>

              {trabajoActual.resultados.mapaPlanchas.map((plancha, index) => (
                <div key={index}>
                  <h4 style={{color:'#64748b'}}>Plancha {index + 1}</h4>
                  <div className="mapa-plancha" style={{ width: anchoMaximoDibujo, height: trabajoActual.planchaAlto * escala }}>
                    {plancha.piezasColocadas.map(p => {
                      // El espacio que reserva el algoritmo (incluye margen)
                      const espacioWidth = (p.rotada ? p.h : p.w) * escala;
                      const espacioHeight = (p.rotada ? p.w : p.h) * escala;
                      
                      // La pieza real que te llevas (sin el margen)
                      const piezaWidth = (p.rotada ? p.hOriginal : p.wOriginal) * escala;
                      const piezaHeight = (p.rotada ? p.wOriginal : p.hOriginal) * escala;

                      return (
                        <div key={p.id} className="mapa-espacio" style={{ left: p.x * escala, top: p.y * escala, width: espacioWidth, height: espacioHeight }}>
                          <div className="mapa-pieza" style={{ width: piezaWidth, height: piezaHeight }}>
                            {p.wOriginal}x{p.hOriginal} {p.rotada ? '(R)' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;