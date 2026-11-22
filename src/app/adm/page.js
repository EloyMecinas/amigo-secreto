'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [participantes, setParticipantes] = useState([]);
  const [presupuesto, setPresupuesto] = useState('');
  const [fechaEvento, setFechaEvento] = useState('');
  const [sorteoRealizado, setSorteoRealizado] = useState(true); // Forzado en true

  useEffect(() => {
    verificarAdminYCargar();
  }, []);

  const verificarAdminYCargar = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/');
      return;
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!perfil || !perfil.es_admin) {
      router.push('/');
      return;
    }

    await cargarDatosAdmin();
    setLoading(false);
  };

  const cargarDatosAdmin = async () => {
    const { data: config } = await supabase
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (config) {
      setPresupuesto(config.presupuesto || '');
      setFechaEvento(config.fecha_evento || '');
    }

    const { data: todos } = await supabase.from('perfiles').select('*');
    if (todos) {
      setParticipantes(todos);
    }
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('configuracion')
      .upsert([{ id: 1, fecha_evento: fechaEvento, presupuesto }]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('✅ Configuración actualizada con éxito.');
    }
  };

  const ejecutarSorteo = async () => {
    if (participantes.length < 2) {
      alert('Se necesitan al menos 2 participantes.');
      return;
    }

    const ids = participantes.map(p => p.id);
    let asignaciones = {};
    let valido = false;

    while (!valido) {
      let mezcla = [...ids].sort(() => Math.random() - 0.5);
      valido = true;
      for (let i = 0; i < ids.length; i++) {
        if (ids[i] === mezcla[i]) {
          valido = false;
          break;
        }
      }
      if (valido) {
        for (let i = 0; i < ids.length; i++) {
          asignaciones[ids[i]] = mezcla[i];
        }
      }
    }

    for (const id of ids) {
      await supabase
        .from('perfiles')
        .update({ amigo_secreto_id: asignaciones[id] })
        .eq('id', id);
    }

    await cargarDatosAdmin();
    alert('🎲 ¡Sorteo realizado correctamente!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-[#8B0000] font-medium">
        Cargando panel de administración...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#333333] p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-xs text-gray-500 hover:text-[#8B0000] font-medium"
        >
          ← Volver al Inicio
        </button>
        <h1 className="text-xl font-bold text-[#8B0000]">Panel de Administración</h1>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#F2E8DC]">
          <h2 className="text-base font-bold text-[#8B0000] mb-4">⚙️ Configuración General</h2>
          <form onSubmit={guardarConfiguracion} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha y Hora del Evento</label>
              <input
                type="datetime-local"
                value={fechaEvento}
                onChange={(e) => setFechaEvento(e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Presupuesto Sugerido</label>
              <input
                type="text"
                value={presupuesto}
                onChange={(e) => setPresupuesto(e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#8B0000] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#6B0000] text-xs"
            >
              Guardar Cambios
            </button>
          </form>
        </section>

        <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#F2E8DC] text-center">
          <h2 className="text-base font-bold text-[#8B0000] mb-2">🎲 Sorteo del Amigo Secreto</h2>
          <p className="text-xs text-gray-500 mb-4">
            Las asignaciones ya están activas para los participantes.
          </p>
          <button
            type="button"
            onClick={ejecutarSorteo}
            className="bg-[#2E7D32] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#25632A] text-xs"
          >
            🔄 Re-ejecutar Sorteo
          </button>
        </section>
      </div>
    </main>
  );
}