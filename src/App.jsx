import { useState, useEffect } from 'react';
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./components/ui/card";
import { Trash2, Plus, ArrowLeft, Save, LayoutGrid } from "lucide-react";

function App() {
  const [trabajos, setTrabajos] = useState(() => {
    const guardados = localStorage.getItem('trabajos_cortes_shadcn');
    return guardados ? JSON.parse(guardados) : [];
  });
  const [vista, setVista] = useState('lista'); 
  const [trabajoActual, setTrabajoActual] = useState({
    id: null, nombre: '', planchaAncho: 244, planchaAlto: 122, margen: 0.5, cortes: [], resultados: null
  });

  useEffect(() => {
    localStorage.setItem('trabajos_cortes_shadcn', JSON.stringify(trabajos));
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
      const wReal = parseFloat(corte.ancho) + margen;
      const hReal = parseFloat(corte.alto) + margen;
      const qty = parseInt(corte.cantidad);

      for (let i = 0; i < qty; i++) {
        piezasAcomodar.push({ 
          id: `${index}-${i}`, w: wReal, h: hReal, wOriginal: parseFloat(corte.ancho), hOriginal: parseFloat(corte.alto) 
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
             alert(`La pieza de ${pieza.wOriginal}x${pieza.hOriginal} (con margen) es más grande que la plancha.`);
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

  // --- VISTA: LISTA DE TRABAJOS ---
  if (vista === 'lista') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mis Trabajos de Corte</h1>
          <Button onClick={() => { setTrabajoActual({ id: null, nombre: '', planchaAncho: 244, planchaAlto: 122, margen: 0.5, cortes: [], resultados: null }); setVista('editor'); }}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Trabajo
          </Button>
        </div>
        
        <div className="grid gap-4">
          {trabajos.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">{t.nombre}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Material: {t.planchaAncho}x{t.planchaAlto} cm | Planchas: {t.resultados?.planchasNecesarias || 0}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setTrabajoActual(t); setVista('editor'); }}>Abrir</Button>
                  <Button variant="destructive" size="icon" onClick={() => eliminarTrabajo(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {trabajos.length === 0 && (
            <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg">
              No tienes trabajos guardados aún. Haz clic en "Nuevo Trabajo" para empezar.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Ancho base para dibujar la plancha en pantalla
  const anchoMaximoDibujo = 600; 
  const escala = trabajoActual.planchaAncho ? anchoMaximoDibujo / trabajoActual.planchaAncho : 1;

  // --- VISTA: EDITOR (DASHBOARD) ---
  return (
    <div className="max-w-[1400px] mx-auto p-6">
      <Button variant="ghost" className="mb-6" onClick={() => setVista('lista')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mis Trabajos
      </Button>
      
      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: CONTROLES */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{trabajoActual.id ? 'Editar Proyecto' : 'Nuevo Proyecto'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del Proyecto</label>
                <Input value={trabajoActual.nombre} onChange={e => setTrabajoActual({...trabajoActual, nombre: e.target.value})} placeholder="Ej. Mueble de Cocina" />
              </div>

              <div className="pt-4 border-t space-y-4">
                <h3 className="font-medium text-slate-700">Material Base</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 uppercase">Ancho (cm)</label>
                    <Input type="number" value={trabajoActual.planchaAncho} onChange={e => setTrabajoActual({...trabajoActual, planchaAncho: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 uppercase">Alto (cm)</label>
                    <Input type="number" value={trabajoActual.planchaAlto} onChange={e => setTrabajoActual({...trabajoActual, planchaAlto: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 uppercase">Margen de Sierra (cm)</label>
                  <Input type="number" step="0.1" value={trabajoActual.margen} onChange={e => setTrabajoActual({...trabajoActual, margen: e.target.value})} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Piezas a Cortar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trabajoActual.cortes.map((corte, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input type="number" placeholder="Ancho" value={corte.ancho} onChange={e => actualizarCorte(i, 'ancho', e.target.value)} />
                  <Input type="number" placeholder="Alto" value={corte.alto} onChange={e => actualizarCorte(i, 'alto', e.target.value)} />
                  <Input type="number" placeholder="Cant." value={corte.cantidad} onChange={e => actualizarCorte(i, 'cantidad', e.target.value)} />
                  <Button variant="destructive" size="icon" onClick={() => setTrabajoActual({...trabajoActual, cortes: trabajoActual.cortes.filter((_, idx) => idx !== i)})}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2" onClick={() => setTrabajoActual({...trabajoActual, cortes: [...trabajoActual.cortes, { ancho: '', alto: '', cantidad: 1 }]})}>
                <Plus className="mr-2 h-4 w-4" /> Agregar Pieza
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button className="w-full h-12 text-md" onClick={calcularResultadosFisicos}>
              <LayoutGrid className="mr-2 h-5 w-5" /> Calcular Cortes
            </Button>
            <Button variant="secondary" className="w-full" onClick={guardarTrabajo}>
              <Save className="mr-2 h-4 w-4" /> Guardar Trabajo
            </Button>
          </div>
        </div>

        {/* COLUMNA DERECHA: RESULTADOS VISUALES */}
        <div className="lg:col-span-8">
          <Card className="h-full min-h-[600px] bg-slate-50/50">
            <CardHeader>
              <CardTitle>Resultados y Mapa de Corte</CardTitle>
              <CardDescription>Genera los cálculos para ver la disposición de las piezas.</CardDescription>
            </CardHeader>
            <CardContent>
              {!trabajoActual.resultados ? (
                <div className="flex items-center justify-center h-64 text-slate-400">
                  Ingresa tus dimensiones y calcula para ver el mapa.
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-blue-50 border-blue-100">
                      <CardContent className="p-6">
                        <p className="text-sm text-blue-600 font-medium uppercase tracking-wide">Planchas Necesarias</p>
                        <p className="text-4xl font-bold text-blue-900 mt-2">{trabajoActual.resultados.planchasNecesarias}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-100">
                      <CardContent className="p-6">
                        <p className="text-sm text-emerald-600 font-medium uppercase tracking-wide">Aprovechamiento</p>
                        <p className="text-4xl font-bold text-emerald-900 mt-2">{trabajoActual.resultados.porcentajeUso}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    {trabajoActual.resultados.mapaPlanchas.map((plancha, index) => (
                      <div key={index} className="space-y-2">
                        <h4 className="font-semibold text-slate-700">Plancha {index + 1}</h4>
                        <div 
                          className="relative bg-slate-200 border-2 border-slate-400 rounded overflow-hidden shadow-inner" 
                          style={{ width: anchoMaximoDibujo, height: trabajoActual.planchaAlto * escala }}
                        >
                          {plancha.piezasColocadas.map(p => {
                            const espacioWidth = (p.rotada ? p.h : p.w) * escala;
                            const espacioHeight = (p.rotada ? p.w : p.h) * escala;
                            const piezaWidth = (p.rotada ? p.hOriginal : p.wOriginal) * escala;
                            const piezaHeight = (p.rotada ? p.wOriginal : p.hOriginal) * escala;

                            return (
                              <div key={p.id} className="absolute border border-dashed border-slate-400 bg-transparent" style={{ left: p.x * escala, top: p.y * escala, width: espacioWidth, height: espacioHeight }}>
                                <div className="absolute top-0 left-0 bg-amber-500 border border-amber-600 text-white text-xs font-bold flex items-center justify-center shadow-sm overflow-hidden" style={{ width: piezaWidth, height: piezaHeight }}>
                                  {p.wOriginal}x{p.hOriginal} {p.rotada ? '⟳' : ''}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;