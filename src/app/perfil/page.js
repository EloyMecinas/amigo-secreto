'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    cargarPerfilUsuario();
  }, []);

  const cargarPerfilUsuario = async () => {
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

    if (perfil) {
      setNombre(perfil.nombre || '');
      setCelular(perfil.celular || '');
    }
    setLoading(false);
  };

  const actualizarPerfil = async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (password) {
      await supabase.auth.updateUser({ password });
    }

    const { error } = await supabase
      .from('perfiles')
      .update({ nombre, celular, ...(password ? { clave_respaldo: password } : {}) })
      .eq('id', session.user.id);

    if (error) {
      alert('Error al actualizar: ' + error.message);
    } else {
      alert('✅ ¡Perfil actualizado con éxito!');
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-[#8B0000] font-medium">
        Cargando perfil...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#333333] p-4 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#F2E8DC] w-full max-w-md">
        <h1 className="text-xl font-bold text-[#8B0000] mb-6 text-center">Editar Mi Perfil</h1>
        <form onSubmit={actualizarPerfil} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre Completo</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono / Celular</label>
            <input
              type="text"
              required
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nueva Contraseña (Opcional)</label>
            <input
              type="password"
              placeholder="Dejar en blanco para mantener actual"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-1/2 py-2.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 bg-[#8B0000] text-white text-xs font-semibold rounded-xl hover:bg-[#6B0000]"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}