import { useState, useEffect } from 'react';
import { Trash2, Plus, ArrowLeft, Save, LayoutGrid } from "lucide-react";

function App() {
  const [trabajos, setTrabajos] = useState(() => {
    const guardados = localStorage.getItem('trabajos_cortes_dark_v1');
    return guardados ? JSON.parse(guardados) : [];
  });
  const [vista, setVista] = useState('lista'); 
  const [trabajoActual, setTrabajoActual] = useState({
    id: null, nombre: '', planchaAncho: 244, planchaAlto: 122, margen: 0.5, cortes: [], resultados: null
  });

  useEffect(() => {
    localStorage.setItem('trabajos_cortes_dark_v1', JSON.stringify(trabajos));
  }, [trabajos]);

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
    } else if (w <= nodoRaiz.w && h <= nodoRaiz.h) return nodoRaiz;
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
    if (trabajoActual.cortes.length === 0) return alert("Agrega al menos una pieza.");

    let piezasAcomodar = [];
    trabajoActual.cortes.forEach((corte, index) => {
      if (!corte.ancho || !corte.alto || !corte.cantidad) return;
      for (let i = 0; i < parseInt(corte.cantidad); i++) {
        piezasAcomodar.push({ 
          id: `${index}-${i}`, 
          w: parseFloat(corte.ancho) + margen, 
          h: parseFloat(corte.alto) + margen, 
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
             return alert(`La pieza de ${pieza.wOriginal}x${pieza.hOriginal} (con margen) excede la plancha.`);
          }
        }
      }
      areaPuraUsada += (pieza.wOriginal * pieza.hOriginal);
    });

    const areaTotalPlanchas = planchasUtilizadas.length * pW * pH;
    setTrabajoActual({
      ...trabajoActual,
      resultados: { 
        planchasNecesarias: planchasUtilizadas.length, 
        porcentajeUso: planchasUtilizadas.length > 0 ? ((areaPuraUsada / areaTotalPlanchas) * 100).toFixed(2) : 0, 
        mapaPlanchas: planchasUtilizadas 
      }
    });
  };

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

  // --- CLASES DE TAILWIND (MODO OSCURO AJUSTADO) ---
  const inputClass = "flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const btnPrimary = "inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors w-full";
  const btnSecondary = "inline-flex items-center justify-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 transition-colors w-full";
  const btnDanger = "inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 transition-colors";
  const cardClass = "rounded-xl border border-slate-800 bg-slate-900 shadow-xl p-6 transition-all";

  // Asegurar fondo oscuro en toda la página
  useEffect(() => {
    document.body.className = "bg-slate-950 text-slate-100";
  }, []);

  if (vista === 'lista') {
    return (
      <div className="max-w-5xl mx-auto p-6 font-sans">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Mis Trabajos de Corte</h1>
          <button className={`${btnPrimary} w-auto`} onClick={() => { setTrabajoActual({ id: null, nombre: '', planchaAncho: 244, planchaAlto: 122, margen: 0.5, cortes: [], resultados: null }); setVista('editor'); }}>
            <Plus className="mr-2 h-5 w-5" /> Nuevo Trabajo
          </button>
        </div>
        <div className="grid gap-6">
          {trabajos.map(t => (
            <div key={t.id} className={`${cardClass} flex justify-between items-center hover:border-blue-700 transition-all hover:-translate-y-1`}>
              <div>
                <h3 className="text-2xl font-semibold text-white">{t.nombre}</h3>
                <p className="text-slate-400 text-base mt-1">Material: {t.planchaAncho}x{t.planchaAlto} cm | Planchas: {t.resultados?.planchasNecesarias || 0}</p>
              </div>
              <div className="flex gap-3">
                <button className="border border-slate-600 px-5 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors" onClick={() => { setTrabajoActual(t); setVista('editor'); }}>Abrir</button>
                <button className={btnDanger} onClick={() => setTrabajos(trabajos.filter(x => x.id !== t.id))}><Trash2 className="h-5 w-5" /></button>
              </div>
            </div>
          ))}
          {trabajos.length === 0 && (
            <div className="text-center py-20 text-slate-500 border-4 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
               <LayoutGrid className="h-16 w-16 mx-auto mb-6 text-slate-700"/>
              No tienes trabajos guardados aún. <br/> Haz clic en "+ Nuevo Trabajo" para empezar.
            </div>
          )}
        </div>
      </div>
    );
  }

  const anchoMax = 700; 
  const escala = trabajoActual.planchaAncho ? anchoMax / trabajoActual.planchaAncho : 1;

  return (
    <div className="max-w-[1450px] mx-auto p-6 font-sans">
      <button className="flex items-center text-sm text-slate-400 hover:text-white mb-8 font-medium transition-colors" onClick={() => setVista('lista')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mis Trabajos
      </button>
      
      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className={cardClass}>
            <h3 className="text-xl font-bold mb-6 text-white border-b border-slate-800 pb-3">{trabajoActual.id ? 'Editar' : 'Nuevo'} Proyecto</h3>
            <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-slate-300">Nombre del Proyecto</label>
                <input className={inputClass} value={trabajoActual.nombre} onChange={e => setTrabajoActual({...trabajoActual, nombre: e.target.value})} placeholder="Ej. Mueble de Cocina" />
            </div>
            
            <h4 className="font-semibold text-base text-slate-100 mb-3 pt-4 border-t border-slate-800">Material Base</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Ancho (cm)</label>
                  <input className={inputClass} type="number" placeholder="Ej. 244" value={trabajoActual.planchaAncho} onChange={e => setTrabajoActual({...trabajoActual, planchaAncho: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Alto (cm)</label>
                  <input className={inputClass} type="number" placeholder="Ej. 122" value={trabajoActual.planchaAlto} onChange={e => setTrabajoActual({...trabajoActual, planchaAlto: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Margen de corte / Disco (cm)</label>
                <input className={inputClass} type="number" step="0.1" placeholder="Ej. 0.4" value={trabajoActual.margen} onChange={e => setTrabajoActual({...trabajoActual, margen: e.target.value})} />
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="text-xl font-bold mb-6 text-white border-b border-slate-800 pb-3">Piezas a Cortar</h3>
            <div className="space-y-4">
                {trabajoActual.cortes.map((corte, i) => (
                  <div key={i} className="flex gap-2.5 items-end bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-slate-400">Ancho</label>
                        <input className={inputClass} type="number" placeholder="An" value={corte.ancho} onChange={e => actualizarCorte(i, 'ancho', e.target.value)} />
                    </div>
                     <div className="flex-1 space-y-1">
                         <label className="text-xs font-medium text-slate-400">Alto</label>
                        <input className={inputClass} type="number" placeholder="Al" value={corte.alto} onChange={e => actualizarCorte(i, 'alto', e.target.value)} />
                    </div>
                     <div className="w-20 space-y-1">
                         <label className="text-xs font-medium text-slate-400">Cant.</label>
                        <input className={inputClass} type="number" placeholder="Cant" value={corte.cantidad} onChange={e => actualizarCorte(i, 'cantidad', e.target.value)} />
                    </div>
                    <button className={`${btnDanger} self-center h-10 mt-5`} onClick={() => setTrabajoActual({...trabajoActual, cortes: trabajoActual.cortes.filter((_, idx) => idx !== i)})}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
            </div>
            <button className="border border-slate-700 w-full py-3 mt-4 rounded-md hover:bg-slate-800 text-sm font-semibold transition-colors text-slate-200" onClick={() => setTrabajoActual({...trabajoActual, cortes: [...trabajoActual.cortes, { ancho: '', alto: '', cantidad: 1 }]})}>+ Agregar Pieza</button>
          </div>

          <div className="space-y-4">
              <button className={`${btnPrimary} h-14 text-base`} onClick={calcularResultadosFisicos}><LayoutGrid className="mr-2 h-6 w-6" /> Calcular Cortes Físicos</button>
              <button className={btnSecondary} onClick={guardarTrabajo}><Save className="mr-2 h-5 w-5" /> Guardar Proyecto</button>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className={`${cardClass} bg-slate-900 min-h-[600px] border-2 border-slate-800`}>
            <h3 className="text-2xl font-bold mb-8 text-white">Mapa de Corte y Resultados</h3>
            {!trabajoActual.resultados ? (
              <div className="text-center text-slate-600 mt-32 border-4 border-dashed border-slate-800 rounded-2xl py-16 bg-slate-950">
                  <LayoutGrid className="h-20 w-20 mx-auto mb-6 text-slate-800"/>
                  Ingresa las piezas y haz clic en "Calcular Cortes Físicos" <br/> para visualizar la distribución aquí.
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div className="bg-blue-950/50 border border-blue-900 p-6 rounded-xl shadow-inner"><p className="text-base text-blue-300 font-semibold uppercase tracking-wider">Planchas Necesarias</p><p className="text-5xl font-extrabold text-white mt-3">{trabajoActual.resultados.planchasNecesarias}</p></div>
                  <div className="bg-emerald-950/50 border border-emerald-900 p-6 rounded-xl shadow-inner"><p className="text-base text-emerald-300 font-semibold uppercase tracking-wider">% Aprovechamiento</p><p className="text-5xl font-extrabold text-white mt-3">{trabajoActual.resultados.porcentajeUso}%</p></div>
                </div>
                {trabajoActual.resultados.mapaPlanchas.map((plancha, i) => (
                  <div key={i} className="mb-10 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-lg">
                    <h4 className="font-bold text-lg text-white mb-4">Plancha {i + 1} ({trabajoActual.planchaAncho}x{trabajoActual.planchaAlto} cm)</h4>
                    <div className="relative bg-slate-800 border-2 border-slate-700 rounded-md overflow-hidden shadow-inner" style={{ width: anchoMax, height: trabajoActual.planchaAlto * escala }}>
                      {plancha.piezasColocadas.map(p => (
                        <div key={p.id} className="absolute border-2 border-dashed border-slate-500 bg-slate-800" style={{ left: p.x * escala, top: p.y * escala, width: (p.rotada ? p.h : p.w) * escala, height: (p.rotada ? p.w : p.h) * escala }}>
                          <div className="absolute top-0 left-0 bg-amber-500 border-2 border-amber-700 text-white text-[11px] font-extrabold flex items-center justify-center overflow-hidden shadow" style={{ width: (p.rotada ? p.hOriginal : p.wOriginal) * escala, height: (p.rotada ? p.wOriginal : p.hOriginal) * escala }}>
                            <span className="leading-tight text-center">{p.wOriginal}x{p.hOriginal} {p.rotada ? '⟳' : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;