'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Configuración del Evento
  const [fechaEvento, setFechaEvento] = useState('2026-10-31T14:43');
  const [presupuesto, setPresupuesto] = useState('S/ 50 - S/ 100');
  const [participantes, setParticipantes] = useState([]);
  const [sorteoRealizado, setSorteoRealizado] = useState(false);

  // Cronómetro
  const [tiempoRestante, setTiempoRestante] = useState({
    dias: '00',
    horas: '00',
    minutos: '00',
    segundos: '00',
    expirado: false
  });

  // Autenticación
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [authError, setAuthError] = useState('');

  // Modal Regalos (Actualizado con campo de detalles/tallas)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [regaloImagen, setRegaloImagen] = useState('');
  const [regaloUrl, setRegaloUrl] = useState('');
  const [regaloDetalles, setRegaloDetalles] = useState('');
  const [deseos, setDeseos] = useState([null, null, null]);

  // Modal Ampliar Imagen (Zoom)
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  // Cajita Sorpresa Amigo Secreto
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [amigoSecretoInfo, setAmigoSecretoInfo] = useState(null); 
  const [personaQueMeRegalaInfo, setPersonaQueMeRegalaInfo] = useState(null); 

  // Edición Perfil Propio
  const [modalPerfilAbierto, setModalPerfilAbierto] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editCelular, setEditCelular] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Edición Admin de Participante
  const [modalAdminEditAbierto, setModalAdminEditAbierto] = useState(false);
  const [usuarioAEditar, setUsuarioAEditar] = useState(null);
  const [adminEditNombre, setAdminEditNombre] = useState('');
  const [adminEditCelular, setAdminEditCelular] = useState('');
  const [adminEditPassword, setAdminEditPassword] = useState('');

  // Chats Flotantes
  const [chatRegaloAbierto, setChatRegaloAbierto] = useState(false); 
  const [chatAnoniAbierto, setChatAnoniAbierto] = useState(false); 
  
  const [mensajeRegalo, setMensajeRegalo] = useState('');
  const [mensajeAnoni, setMensajeAnoni] = useState('');
  const [mensajesDB, setMensajesDB] = useState([]);

  const limpiarFormulario = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNombre('');
    setCelular('');
    setAuthError('');
  };

  const normalizarFechaInput = (fechaStr) => {
    if (!fechaStr) return '2026-10-31T14:43';
    if (fechaStr.length > 16) {
      return fechaStr.substring(0, 16);
    }
    return fechaStr;
  };

  useEffect(() => {
    const cargarTodo = async () => {
      await cargarConfiguracionGlobal();

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        await cargarPerfil(session.user.id);
        await cargarMensajes();
      }
      setLoading(false);
    };

    cargarTodo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        cargarPerfil(session.user.id);
        cargarMensajes();
      }
    });

    const channelConfig = supabase
      .channel('cambios-globales')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'configuracion' },
        (payload) => {
          if (payload.new) {
            if (payload.new.fecha_evento) setFechaEvento(normalizarFechaInput(payload.new.fecha_evento));
            if (payload.new.presupuesto) setPresupuesto(payload.new.presupuesto);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_chat' },
        (payload) => {
          if (payload.new) {
            setMensajesDB((prev) => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channelConfig);
    };
  }, []);

  const cargarConfiguracionGlobal = async () => {
    const { data } = await supabase
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (data) {
      if (data.fecha_evento) setFechaEvento(normalizarFechaInput(data.fecha_evento));
      if (data.presupuesto) setPresupuesto(data.presupuesto);
    }
  };

  const cargarMensajes = async () => {
    const { data } = await supabase.from('mensajes_chat').select('*');
    if (data) setMensajesDB(data);
  };

  const ejecutarSorteoAutomatico = async (listaParticipantes) => {
    if (listaParticipantes.length < 2) return;

    const ids = listaParticipantes.map(p => p.id);
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

    for (const participanteId of ids) {
      await supabase
        .from('perfiles')
        .update({ amigo_secreto_id: asignaciones[participanteId] })
        .eq('id', participanteId);
    }

    setSorteoRealizado(true);
    if (session) await cargarPerfil(session.user.id);
  };

  useEffect(() => {
    const calcularTiempo = () => {
      const fechaLimpia = normalizarFechaInput(fechaEvento);
      const meta = new Date(fechaLimpia).getTime();
      const ahora = new Date().getTime();
      const diferencia = meta - ahora;

      if (isNaN(meta) || diferencia <= 0) {
        setTiempoRestante({
          dias: '00',
          horas: '00',
          minutos: '00',
          segundos: '00',
          expirado: true
        });

        if (!sorteoRealizado && participantes.length > 0) {
          ejecutarSorteoAutomatico(participantes);
        }
        return;
      }

      const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

      setTiempoRestante({
        dias: String(dias).padStart(2, '0'),
        horas: String(horas).padStart(2, '0'),
        minutos: String(minutos).padStart(2, '0'),
        segundos: String(segundos).padStart(2, '0'),
        expirado: false
      });
    };

    calcularTiempo();
    const intervalo = setInterval(calcularTiempo, 1000);

    return () => clearInterval(intervalo);
  }, [fechaEvento, participantes, sorteoRealizado]);

  const cargarPerfil = async (userId) => {
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setPerfil(data);
      if (data.deseos) setDeseos(data.deseos);

      const { data: todos } = await supabase.from('perfiles').select('*');
      if (todos) {
        setParticipantes(todos);
        const yaSorteado = todos.some(p => p.amigo_secreto_id);
        if (yaSorteado) setSorteoRealizado(true);

        if (data.amigo_secreto_id) {
          const amigo = todos.find(p => p.id === data.amigo_secreto_id);
          if (amigo) setAmigoSecretoInfo(amigo);
        }

        const quienMeRegala = todos.find(p => p.amigo_secreto_id === data.id);
        if (quienMeRegala) setPersonaQueMeRegalaInfo(quienMeRegala);
      }
    }
  };

  const cargarParticipantes = async () => {
    const { data } = await supabase.from('perfiles').select('*');
    if (data) {
      setParticipantes(data);
      const yaSorteado = data.some(p => p.amigo_secreto_id);
      if (yaSorteado) setSorteoRealizado(true);
    }
  };

  const guardarConfiguracionEvento = async (e) => {
    e.preventDefault();
    const fechaLimpia = normalizarFechaInput(fechaEvento);

    try {
      const { error } = await supabase
        .from('configuracion')
        .upsert([
          {
            id: 1,
            fecha_evento: fechaLimpia,
            presupuesto: presupuesto,
          },
        ]);

      if (error) {
        alert('Error al guardar configuración: ' + error.message);
        return;
      }

      setFechaEvento(fechaLimpia);
      alert('✅ Configuración guardada y sincronizada al instante.');
    } catch (err) {
      alert('Error inesperado al guardar la configuración.');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (esRegistro) {
      if (!celular || celular.trim() === '') {
        setAuthError('El número de celular es obligatorio.');
        return;
      }

      if (password !== confirmPassword) {
        setAuthError('Las contraseñas no coinciden. Por favor verifícalas.');
        return;
      }

      try {
        const { error: errorSignUp } = await supabase.auth.signUp({
          email,
          password,
        });

        if (errorSignUp) {
          setAuthError(errorSignUp.message);
          return;
        }

        const { data: signInData, error: errorSignIn } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (errorSignIn) {
          setAuthError('Error al autenticar sesión tras el registro: ' + errorSignIn.message);
          return;
        }

        const userId = signInData?.user?.id;

        if (!userId) {
          setAuthError('No se pudo validar el ID del usuario.');
          return;
        }

        const { error: profileError } = await supabase
          .from('perfiles')
          .upsert([
            {
              id: userId,
              nombre: nombre,
              celular: celular,
              clave_respaldo: password,
              deseos: [null, null, null],
              es_admin: false,
            },
          ]);

        if (profileError) {
          setAuthError('Error al guardar en tabla perfiles: ' + profileError.message);
          return;
        }

        alert('🎉 ¡Registro exitoso! Bienvenido a Amigo Secreto.');
        limpiarFormulario();
        setEsRegistro(false);
        await cargarPerfil(userId);

      } catch (err) {
        setAuthError('Ocurrió un error inesperado al procesar el registro.');
      }
    } else {
      const { error: errorSignIn } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (errorSignIn) {
        setAuthError('Credenciales incorrectas o usuario no encontrado.');
      } else {
        limpiarFormulario();
      }
    }
  };

  const guardarCambiosPerfilUsuario = async (e) => {
    e.preventDefault();
    if (!session) return;

    try {
      if (editPassword && editPassword.trim() !== '') {
        const { error: passError } = await supabase.auth.updateUser({ password: editPassword });
        if (passError) {
          alert('Error al actualizar contraseña: ' + passError.message);
          return;
        }
      }

      const updates = {
        nombre: editNombre,
        celular: editCelular,
      };

      if (editPassword && editPassword.trim() !== '') {
        updates.clave_respaldo = editPassword;
      }

      const { error: profileError } = await supabase
        .from('perfiles')
        .update(updates)
        .eq('id', session.user.id);

      if (profileError) {
        alert('Error al actualizar perfil: ' + profileError.message);
        return;
      }

      alert('✅ ¡Perfil actualizado correctamente!');
      setModalPerfilAbierto(false);
      await cargarPerfil(session.user.id);
    } catch (err) {
      alert('Error inesperado al guardar cambios.');
    }
  };

  const abrirAdminEdit = (part) => {
    setUsuarioAEditar(part);
    setAdminEditNombre(part.nombre || '');
    setAdminEditCelular(part.celular || '');
    setAdminEditPassword(part.clave_respaldo || '');
    setModalAdminEditAbierto(true);
  };

  const guardarCambiosUsuarioPorAdmin = async (e) => {
    e.preventDefault();
    if (!usuarioAEditar) return;

    try {
      const updates = {
        nombre: adminEditNombre,
        celular: adminEditCelular,
        clave_respaldo: adminEditPassword,
      };

      const { error } = await supabase
        .from('perfiles')
        .update(updates)
        .eq('id', usuarioAEditar.id);

      if (error) {
        alert('Error al actualizar participante: ' + error.message);
        return;
      }

      alert('✅ ¡Datos del participante actualizados correctamente!');
      setModalAdminEditAbierto(false);
      cargarParticipantes();
    } catch (err) {
      alert('Error inesperado al guardar datos.');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !session) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Url = reader.result;
        setPerfil((prev) => ({ ...prev, foto_url: base64Url }));

        await supabase
          .from('perfiles')
          .update({ foto_url: base64Url })
          .eq('id', session.user.id);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error al cargar la foto:', err);
    }
  };

  const handleRegaloImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setRegaloImagen(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const guardarRegalo = async () => {
    if (!regaloImagen && !regaloUrl && !regaloDetalles) return;

    const nuevosDeseos = [...deseos];
    nuevosDeseos[slotSeleccionado] = {
      imagen: regaloImagen,
      url: regaloUrl,
      detalles: regaloDetalles,
    };

    setDeseos(nuevosDeseos);
    setModalAbierto(false);
    setRegaloImagen('');
    setRegaloUrl('');
    setRegaloDetalles('');

    if (session) {
      await supabase
        .from('perfiles')
        .update({ deseos: nuevosDeseos })
        .eq('id', session.user.id);
    }
  };

  const ejecutarSorteoManual = () => {
    if (participantes.length < 2) {
      alert('⚠️ Se necesitan al menos 2 participantes registrados para realizar el sorteo.');
      return;
    }
    ejecutarSorteoAutomatico(participantes);
    alert('🎲 ¡Sorteo realizado con éxito!');
  };

  const enviarMensajeRegalo = async (e) => {
    e.preventDefault();
    if (!mensajeRegalo.trim() || !amigoSecretoInfo) return;

    await supabase.from('mensajes_chat').insert([
      {
        remitente_id: session.user.id,
        destinatario_id: amigoSecretoInfo.id,
        texto: mensajeRegalo,
      }
    ]);
    setMensajeRegalo('');
  };

  const enviarMensajeAnoni = async (e) => {
    e.preventDefault();
    if (!mensajeAnoni.trim() || !personaQueMeRegalaInfo) return;

    await supabase.from('mensajes_chat').insert([
      {
        remitente_id: session.user.id,
        destinatario_id: personaQueMeRegalaInfo.id,
        texto: mensajeAnoni,
      }
    ]);
    setMensajeAnoni('');
  };

  const abrirChatRegalo = async () => {
    setChatRegaloAbierto(true);
    setChatAnoniAbierto(false);
    const ahoraIso = new Date().toISOString();
    setPerfil(prev => ({ ...prev, leido_hasta_regalo: ahoraIso }));
    if (session) {
      await supabase.from('perfiles').update({ leido_hasta_regalo: ahoraIso }).eq('id', session.user.id);
    }
  };

  const abrirChatAnoni = async () => {
    setChatAnoniAbierto(true);
    setChatRegaloAbierto(false);
    const ahoraIso = new Date().toISOString();
    setPerfil(prev => ({ ...prev, leido_hasta_anoni: ahoraIso }));
    if (session) {
      await supabase.from('perfiles').update({ leido_hasta_anoni: ahoraIso }).eq('id', session.user.id);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPerfil(null);
    setModoAdmin(false);
    setEsRegistro(false);
    limpiarFormulario();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-[#8B0000] font-medium">
        Cargando Amigo Secreto...
      </div>
    );
  }

  const nombreUsuario = perfil?.nombre || session?.user?.email?.split('@')[0] || '';
  const esAdmin = perfil?.es_admin === true;

  const tieneNotifRegalo = amigoSecretoInfo && session ? mensajesDB.some(m => {
    if (m.remitente_id !== amigoSecretoInfo.id || m.destinatario_id !== session.user.id) return false;
    if (!perfil?.leido_hasta_regalo) return true;
    return new Date(m.creado_at) > new Date(perfil.leido_hasta_regalo);
  }) : false;

  const tieneNotifAnoni = personaQueMeRegalaInfo && session ? mensajesDB.some(m => {
    if (m.remitente_id !== personaQueMeRegalaInfo.id || m.destinatario_id !== session.user.id) return false;
    if (!perfil?.leido_hasta_anoni) return true;
    return new Date(m.creado_at) > new Date(perfil.leido_hasta_anoni);
  }) : false;

  const formatearFechaLegible = (fechaStr) => {
    const limpia = normalizarFechaInput(fechaStr);
    const [fechaPart, horaPart] = limpia.split('T');
    if (!fechaPart || !horaPart) return fechaStr;
    const [anio, mes, dia] = fechaPart.split('-');
    const [horas, mins] = horaPart.split(':');
    const fechaObj = new Date(anio, mes - 1, dia, horas, mins);
    if (isNaN(fechaObj.getTime())) return fechaStr;
    
    return fechaObj.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] text-[#333333] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#F2E8DC] w-full max-w-md">
          <div className="text-center mb-6">
            <span className="text-4xl">🎄</span>
            <h1 className="text-2xl font-bold text-[#8B0000] mt-2">Amigo Secreto</h1>
            <p className="text-xs text-gray-500 mt-1">
              {esRegistro ? 'Crea tu cuenta para participar' : 'Ingresa con tus datos'}
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs mb-4 border border-red-200 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña</label>
              <input
                type="password"
                required
                autoComplete={esRegistro ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {esRegistro && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmar Contraseña</label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Eloy Mecinas"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono / Celular (Obligatorio)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 987654321"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#8B0000] text-white font-semibold rounded-xl hover:bg-[#6B0000] shadow-sm transition-all text-sm mt-2"
            >
              {esRegistro ? 'Registrarse' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => {
                setEsRegistro(!esRegistro);
                limpiarFormulario();
              }}
              className="text-xs font-semibold text-[#D4AF37] hover:underline"
            >
              {esRegistro ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#333333] p-4 md:p-8 flex flex-col items-center relative">
      
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cerrarSesion}
            className="text-xs text-gray-400 hover:text-red-600 transition-all font-medium"
          >
            ← Cerrar Sesión
          </button>

          <button
            type="button"
            onClick={() => {
              setEditNombre(perfil?.nombre || '');
              setEditCelular(perfil?.celular || '');
              setEditPassword('');
              setModalPerfilAbierto(true);
            }}
            className="w-7 h-7 rounded-full bg-white border border-[#F2E8DC] text-gray-500 hover:text-[#8B0000] hover:border-[#D4AF37] flex items-center justify-center transition-all text-xs shadow-xs"
            title="Editar Mi Cuenta"
          >
            ⚙️
          </button>
        </div>

        {esAdmin && (
          <button
            type="button"
            onClick={() => setModoAdmin(!modoAdmin)}
            className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-[#8B0000] text-white hover:bg-[#6B0000] transition-all shadow-sm flex items-center gap-1.5"
          >
            {modoAdmin ? '👤 Cambiar a Modo Usuario' : '👑 Cambiar a Modo Administrador'}
          </button>
        )}
      </div>

      {esAdmin && modoAdmin ? (
        <div className="w-full max-w-2xl space-y-6">
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#F2E8DC]">
            <h2 className="text-lg font-bold text-[#8B0000] mb-4">⚙️ Configuración del Intercambio</h2>
            
            <form onSubmit={guardarConfiguracionEvento} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha y Hora del Intercambio</label>
                  <input
                    type="datetime-local"
                    value={normalizarFechaInput(fechaEvento)}
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
                    placeholder="Ej. S/ 50 - S/ 100"
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-[#8B0000] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-[#6B0000] transition-all text-xs"
                >
                  💾 Guardar Cambios de Configuración
                </button>
              </div>
            </form>
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#F2E8DC]">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-[#8B0000] mb-1">🎲 Estado del Sorteo</h2>
              <p className="text-xs text-gray-500 mb-4">
                {sorteoRealizado ? 'El sorteo se ha realizado con éxito.' : 'El sorteo está pendiente o se ejecutará al llegar la fecha.'}
              </p>
              <button
                type="button"
                onClick={ejecutarSorteoManual}
                className="bg-[#2E7D32] text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:bg-[#25632A] transition-all text-xs"
              >
                {sorteoRealizado ? '🔄 Re-ejecutar Sorteo' : '🎲 Iniciar Sorteo Ahora'}
              </button>
            </div>

            {sorteoRealizado && participantes.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-bold text-[#8B0000] mb-3">🎁 Asignaciones de Amigos Secretos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px]">
                        <th className="py-2">Participante</th>
                        <th className="py-2">Le regala a</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {participantes.map((part) => {
                        const amigoAsignado = participantes.find(p => p.id === part.amigo_secreto_id);
                        return (
                          <tr key={part.id} className="hover:bg-gray-50">
                            <td className="py-2.5 font-semibold text-gray-800">
                              {part.nombre} {part.es_admin && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded ml-1">Admin</span>}
                            </td>
                            <td className="py-2.5 text-[#8B0000] font-bold">🎁 {amigoAsignado ? amigoAsignado.nombre : 'Pendiente'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#F2E8DC]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#8B0000]">👥 Participantes Registrados ({participantes.length})</h2>
              <button
                type="button"
                onClick={cargarParticipantes}
                className="text-xs text-[#D4AF37] hover:underline font-semibold"
              >
                🔄 Actualizar Lista
              </button>
            </div>

            {participantes.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Aún no hay participantes registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px]">
                      <th className="py-2">Nombre</th>
                      <th className="py-2">Celular</th>
                      <th className="py-2">Clave Respaldo</th>
                      <th className="py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {participantes.map((part) => (
                      <tr key={part.id} className="hover:bg-gray-50">
                        <td className="py-3 font-semibold text-gray-800">
                          {part.nombre} {part.es_admin && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded ml-1">Admin</span>}
                        </td>
                        <td className="py-3 text-gray-600">{part.celular}</td>
                        <td className="py-3 text-gray-400 font-mono">{part.clave_respaldo || '••••'}</td>
                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => abrirAdminEdit(part)}
                            className="bg-[#FAF6F0] text-[#8B0000] border border-[#D4AF37] px-2.5 py-1 rounded-lg font-semibold hover:bg-[#F2E8DC] transition-all text-[11px]"
                          >
                            ✏️ Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="w-full max-w-xl flex flex-col items-center gap-6 pb-20">

          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#8B0000]">
              ¡Bienvenido, {nombreUsuario}! {esAdmin && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full ml-1 font-semibold">Administrador</span>}
            </h1>
          </div>

          <div className="relative group">
            <label className="cursor-pointer block">
              <div className="w-28 h-28 rounded-full bg-[#FAF6F0] border-2 border-dashed border-[#D4AF37] flex flex-col items-center justify-center overflow-hidden shadow-sm hover:border-[#8B0000] transition-all">
                {perfil?.foto_url ? (
                  <img src={perfil.foto_url} alt="Foto de Perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <span className="text-2xl block">📷</span>
                    <span className="text-[10px] font-semibold text-gray-500">Cargar Foto</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>

          <section className="w-full bg-white p-6 rounded-3xl shadow-sm border border-[#F2E8DC]">
            <h2 className="text-center font-bold text-base text-[#8B0000] mb-4">
              Mis Deseos
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {deseos.map((deseo, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSlotSeleccionado(idx);
                    if (deseo) {
                      setRegaloImagen(deseo.imagen || '');
                      setRegaloUrl(deseo.url || '');
                      setRegaloDetalles(deseo.detalles || '');
                    } else {
                      setRegaloImagen('');
                      setRegaloUrl('');
                      setRegaloDetalles('');
                    }
                    setModalAbierto(true);
                  }}
                  className="min-h-[150px] border-2 border-dashed border-[#D4AF37] rounded-2xl flex flex-col items-center justify-between p-2 cursor-pointer hover:bg-[#FDFBF7] transition-all bg-[#FAF6F0] relative overflow-hidden"
                >
                  {deseo?.imagen ? (
                    <>
                      <div className="w-full h-16 relative group overflow-hidden rounded-xl">
                        <img src={deseo.imagen} alt={`Regalo ${idx + 1}`} className="w-full h-full object-cover" />
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setImagenAmpliada(deseo.imagen);
                          }}
                          className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold"
                        >
                          🔍 Ver
                        </div>
                      </div>

                      {deseo?.detalles && (
                        <p className="text-[9px] text-gray-600 font-medium text-center line-clamp-2 w-full px-1 bg-white/60 rounded">
                          📝 {deseo.detalles}
                        </p>
                      )}

                      <div className="w-full flex items-center justify-center mt-1">
                        {deseo?.url ? (
                          <a
                            href={deseo.url.startsWith('http') ? deseo.url : `https://${deseo.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-[#8B0000] text-white py-1 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-[#6B0000] transition-all shadow-xs"
                          >
                            🛒 Comprar
                          </a>
                        ) : (
                          <span className="text-[9px] text-gray-400 font-medium">Sin enlace</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center my-auto">
                      <span className="text-xl text-[#D4AF37] font-bold">+</span>
                      <p className="text-[10px] font-medium text-gray-500 mt-1">Opción {idx + 1}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {sorteoRealizado && (
            <section className="w-full bg-white p-6 rounded-3xl shadow-sm border border-[#F2E8DC] text-center">
              <h2 className="text-base font-bold text-[#8B0000] mb-2">
                🎁 Tu Amigo Secreto
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                {cajaAbierta ? '¡Aquí tienes los detalles de la persona a quien le darás tu regalo!' : 'Haz clic en la caja sorpresa para revelar a quién te tocó y qué desea.'}
              </p>

              <div
                onClick={() => setCajaAbierta(true)}
                className="cursor-pointer bg-[#FAF6F0] border-2 border-dashed border-[#D4AF37] rounded-3xl p-6 hover:bg-[#F2E8DC] transition-all max-w-md mx-auto shadow-xs group"
              >
                {cajaAbierta ? (
                  <div className="space-y-4 text-left">
                    <div className="text-center">
                      <span className="text-3xl block">🎉</span>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Te tocó regalar a:</p>
                      <p className="text-lg font-extrabold text-[#8B0000]">
                        {amigoSecretoInfo ? amigoSecretoInfo.nombre : 'Cargando...'}
                      </p>
                    </div>

                    <div className="border-t border-[#F2E8DC] pt-3">
                      <p className="text-xs font-bold text-[#8B0000] mb-2 text-center">🎁 Los deseos de tu amigo secreto:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {amigoSecretoInfo?.deseos && amigoSecretoInfo.deseos.map((deseoAmigo, idx) => (
                          <div 
                            key={idx} 
                            className="min-h-[160px] bg-white border border-[#F2E8DC] rounded-xl flex flex-col justify-between p-1.5 overflow-hidden shadow-xs"
                          >
                            {deseoAmigo?.imagen ? (
                              <>
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setImagenAmpliada(deseoAmigo.imagen);
                                  }}
                                  className="w-full h-16 relative group overflow-hidden rounded-lg cursor-pointer"
                                >
                                  <img src={deseoAmigo.imagen} alt="Deseo" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                                    🔍 Ver
                                  </div>
                                </div>

                                {deseoAmigo?.detalles && (
                                  <p className="text-[9px] text-gray-700 font-medium text-center line-clamp-3 px-0.5 bg-gray-50 rounded">
                                    📝 {deseoAmigo.detalles}
                                  </p>
                                )}

                                <div className="w-full mt-1">
                                  {deseoAmigo?.url ? (
                                    <a
                                      href={deseoAmigo.url.startsWith('http') ? deseoAmigo.url : `https://${deseoAmigo.url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full bg-[#8B0000] text-white py-1 px-1 rounded-md text-[9px] font-semibold flex items-center justify-center gap-1 hover:bg-[#6B0000] transition-all"
                                    >
                                      🛒 Enlace
                                    </a>
                                  ) : (
                                    <span className="text-[9px] text-gray-400 block text-center">Sin enlace</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-400 text-center my-auto">Sin opción {idx + 1}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group-hover:scale-105 transition-transform text-center">
                    <span className="text-4xl block mb-2">🎁</span>
                    <span className="text-xs font-bold text-[#8B0000] uppercase tracking-wide bg-white px-3 py-1.5 rounded-full border border-[#D4AF37] shadow-xs">
                      Abrir Caja Sorpresa ✨
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          <footer className="w-full text-center bg-white p-6 rounded-3xl shadow-sm border border-[#F2E8DC]">
            <div className="inline-block bg-[#FAF6F0] border border-[#D4AF37] text-[#8B0000] font-semibold text-xs px-4 py-1.5 rounded-full mb-4 shadow-sm">
              💰 Presupuesto sugerido: {presupuesto}
            </div>

            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider mb-1">
              Fecha del Intercambio
            </p>
            <p className="text-sm font-bold text-[#8B0000] mb-4">
              {formatearFechaLegible(fechaEvento)}
            </p>

            {tiempoRestante.expirado ? (
              <div className="bg-[#FAF6F0] p-3 rounded-2xl border border-[#D4AF37] text-[#8B0000] font-bold text-sm">
                🎁 ¡Llegó el día del intercambio de regalos! 🎁
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                <div className="bg-[#FAF6F0] p-2 rounded-xl border border-[#F2E8DC]">
                  <span className="block text-base font-bold text-[#8B0000]">{tiempoRestante.dias}</span>
                  <span className="text-[9px] text-gray-500 font-medium">DÍAS</span>
                </div>
                <div className="bg-[#FAF6F0] p-2 rounded-xl border border-[#F2E8DC]">
                  <span className="block text-base font-bold text-[#8B0000]">{tiempoRestante.horas}</span>
                  <span className="text-[9px] text-gray-500 font-medium">HORAS</span>
                </div>
                <div className="bg-[#FAF6F0] p-2 rounded-xl border border-[#F2E8DC]">
                  <span className="block text-base font-bold text-[#8B0000]">{tiempoRestante.minutos}</span>
                  <span className="text-[9px] text-gray-500 font-medium">MINS</span>
                </div>
                <div className="bg-[#FAF6F0] p-2 rounded-xl border border-[#F2E8DC]">
                  <span className="block text-base font-bold text-[#8B0000]">{tiempoRestante.segundos}</span>
                  <span className="text-[9px] text-gray-500 font-medium">SEGS</span>
                </div>
              </div>
            )}
          </footer>

        </div>
      )}

      {imagenAmpliada && (
        <div 
          onClick={() => setImagenAmpliada(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[90vh] w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => setImagenAmpliada(null)}
              className="absolute -top-10 right-0 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-md"
            >
              ✕
            </button>
            <img src={imagenAmpliada} alt="Imagen ampliada" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border-2 border-white" />
          </div>
        </div>
      )}

      {modalPerfilAbierto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-lg border border-[#F2E8DC]">
            <h3 className="font-bold text-base text-[#8B0000] mb-4 text-center">
              Editar Mi Perfil
            </h3>

            <form onSubmit={guardarCambiosPerfilUsuario} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono / Celular</label>
                <input
                  type="text"
                  required
                  value={editCelular}
                  onChange={(e) => setEditCelular(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nueva Contraseña (Opcional)</label>
                <input
                  type="password"
                  placeholder="Dejar en blanco para no cambiar"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setModalPerfilAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 rounded-xl hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#8B0000] text-white rounded-xl hover:bg-[#6B0000] shadow-sm transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAdminEditAbierto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-lg border border-[#F2E8DC]">
            <h3 className="font-bold text-base text-[#8B0000] mb-4 text-center">
              Corregir Participante
            </h3>

            <form onSubmit={guardarCambiosUsuarioPorAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={adminEditNombre}
                  onChange={(e) => setAdminEditNombre(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono / Celular</label>
                <input
                  type="text"
                  required
                  value={adminEditCelular}
                  onChange={(e) => setAdminEditCelular(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Restablecer Clave (Clave Respaldo)</label>
                <input
                  type="text"
                  required
                  value={adminEditPassword}
                  onChange={(e) => setAdminEditPassword(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setModalAdminEditAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 rounded-xl hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#8B0000] text-white rounded-xl hover:bg-[#6B0000] shadow-sm transition-all"
                >
                  Actualizar Datos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-lg border border-[#F2E8DC]">
            <h3 className="font-bold text-base text-[#8B0000] mb-4 text-center">
              Agregar Opción {slotSeleccionado !== null ? slotSeleccionado + 1 : 1}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  1. Foto del regalo
                </label>
                
                {regaloImagen ? (
                  <div className="relative w-full h-28 rounded-xl overflow-hidden border border-gray-200 mb-2">
                    <img src={regaloImagen} alt="Vista previa" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setRegaloImagen('')}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="w-full flex items-center justify-center gap-2 p-3 bg-[#FAF6F0] border-2 border-dashed border-[#D4AF37] rounded-xl cursor-pointer hover:bg-[#F2E8DC] transition-all">
                    <span className="text-lg">🖼️</span>
                    <span className="text-xs font-semibold text-[#8B0000]">Abrir Galería de Fotos</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleRegaloImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  2. Talla, Medidas o Detalles importantes
                </label>
                <input
                  type="text"
                  placeholder="Ej. Talla M, color azul, zapatilla 40"
                  value={regaloDetalles}
                  onChange={(e) => setRegaloDetalles(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  3. Enlace de compra (Opcional - URL)
                </label>
                <input
                  type="text"
                  placeholder="https://tienda.com/producto"
                  value={regaloUrl}
                  onChange={(e) => setRegaloUrl(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 rounded-xl hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarRegalo}
                className="px-4 py-2 text-xs font-semibold bg-[#8B0000] text-white rounded-xl hover:bg-[#6B0000] shadow-sm transition-all"
              >
                Guardar Regalo
              </button>
            </div>
          </div>
        </div>
      )}

      {sorteoRealizado && session && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
          
          {amigoSecretoInfo && (
            <div className="relative">
              {tieneNotifRegalo && !chatRegaloAbierto && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce z-10 border border-white">
                  !
                </span>
              )}

              {chatRegaloAbierto ? (
                <div className="bg-white rounded-2xl shadow-xl border border-[#8B0000] w-80 h-96 flex flex-col overflow-hidden">
                  <div className="bg-[#8B0000] text-white p-3 flex justify-between items-center">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      🎁 Chat con tu Amigo Secreto
                    </span>
                    <button
                      type="button"
                      onClick={() => setChatRegaloAbierto(false)}
                      className="text-white hover:text-gray-300 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#FAF6F0]">
                    {mensajesDB.filter(m => 
                      (m.remitente_id === session.user.id && m.destinatario_id === amigoSecretoInfo.id) ||
                      (m.remitente_id === amigoSecretoInfo.id && m.destinatario_id === session.user.id)
                    ).length === 0 ? (
                      <p className="text-[11px] text-gray-400 text-center mt-8">
                        Escribe aquí anónimamente a {amigoSecretoInfo.nombre} para darle pistas.
                      </p>
                    ) : (
                      mensajesDB.filter(m => 
                        (m.remitente_id === session.user.id && m.destinatario_id === amigoSecretoInfo.id) ||
                        (m.remitente_id === amigoSecretoInfo.id && m.destinatario_id === session.user.id)
                      ).map((msg, idx) => {
                        const esmio = msg.remitente_id === session.user.id;
                        return (
                          <div key={idx} className={`flex flex-col ${esmio ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] p-2 rounded-xl text-xs ${esmio ? 'bg-[#8B0000] text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                              {msg.texto}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={enviarMensajeRegalo} className="p-2 border-t border-gray-100 flex gap-1.5 bg-white">
                    <input
                      type="text"
                      placeholder="Escribe un mensaje..."
                      value={mensajeRegalo}
                      onChange={(e) => setMensajeRegalo(e.target.value)}
                      className="flex-1 text-xs p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8B0000]"
                    />
                    <button type="submit" className="bg-[#8B0000] text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#6B0000]">
                      Enviar
                    </button>
                  </form>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={abrirChatRegalo}
                  className="w-14 h-14 bg-[#8B0000] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all text-xl border-2 border-white relative"
                  title="Chat: A quien regalo"
                >
                  🎁
                </button>
              )}
            </div>
          )}

          {personaQueMeRegalaInfo && (
            <div className="relative">
              {tieneNotifAnoni && !chatAnoniAbierto && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8B0000] text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce z-10 border border-white">
                  !
                </span>
              )}

              {chatAnoniAbierto ? (
                <div className="bg-white rounded-2xl shadow-xl border border-[#D4AF37] w-80 h-96 flex flex-col overflow-hidden">
                  <div className="bg-[#D4AF37] text-white p-3 flex justify-between items-center">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      ✨ Chat con tu Anónimo
                    </span>
                    <button
                      type="button"
                      onClick={() => setChatAnoniAbierto(false)}
                      className="text-white hover:text-gray-200 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#FAF6F0]">
                    {mensajesDB.filter(m => 
                      (m.remitente_id === session.user.id && m.destinatario_id === personaQueMeRegalaInfo.id) ||
                      (m.remitente_id === personaQueMeRegalaInfo.id && m.destinatario_id === session.user.id)
                    ).length === 0 ? (
                      <p className="text-[11px] text-gray-400 text-center mt-8">
                        Aquí recibirás mensajes de la persona secreta que te va a regalar.
                      </p>
                    ) : (
                      mensajesDB.filter(m => 
                        (m.remitente_id === session.user.id && m.destinatario_id === personaQueMeRegalaInfo.id) ||
                        (m.remitente_id === personaQueMeRegalaInfo.id && m.destinatario_id === session.user.id)
                      ).map((msg, idx) => {
                        const esmio = msg.remitente_id === session.user.id;
                        return (
                          <div key={idx} className={`flex flex-col ${esmio ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] p-2 rounded-xl text-xs ${esmio ? 'bg-[#D4AF37] text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                              {msg.texto}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={enviarMensajeAnoni} className="p-2 border-t border-gray-100 flex gap-1.5 bg-white">
                    <input
                      type="text"
                      placeholder="Responde a tu anónimo..."
                      value={mensajeAnoni}
                      onChange={(e) => setMensajeAnoni(e.target.value)}
                      className="flex-1 text-xs p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button type="submit" className="bg-[#D4AF37] text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#b8972b]">
                      Enviar
                    </button>
                  </form>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={abrirChatAnoni}
                  className="w-14 h-14 bg-[#D4AF37] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all text-xl border-2 border-white relative"
                  title="Chat: Quien me regala"
                >
                  ✨
                </button>
              )}
            </div>
          )}

        </div>
      )}

    </main>
  );
}