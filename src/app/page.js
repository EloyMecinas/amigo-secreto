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

  // Modal Regalos
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
      <div style={{ minHeight: '100vh', backgroundColor: '#FDFBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B0000', fontWeight: 500 }}>
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
      <main style={{ minHeight: '100vh', backgroundColor: '#FDFBF7', color: '#333333', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F2E8DC', width: '100%', maxWidth: '28rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '2.25rem' }}>🎄</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8B0000', marginTop: '0.5rem' }}>Amigo Secreto</h1>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              {esRegistro ? 'Crea tu cuenta para participar' : 'Ingresa con tus datos'}
            </p>
          </div>

          {authError && (
            <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '0.75rem', marginBottom: '1rem', border: '1px solid #fecaca', textAlign: 'center' }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Correo Electrónico</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', fontSize: '0.875rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Contraseña</label>
              <input
                type="password"
                required
                autoComplete={esRegistro ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', fontSize: '0.875rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
              />
            </div>

            {esRegistro && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Confirmar Contraseña</label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Eloy Mecinas"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Teléfono / Celular (Obligatorio)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 987654321"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              style={{ width: '100%', padding: '0.75rem', backgroundColor: '#8B0000', color: 'white', fontWeight: 600, borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', marginTop: '0.5rem' }}
            >
              {esRegistro ? 'Registrarse' : 'Iniciar Sesión'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setEsRegistro(!esRegistro);
                limpiarFormulario();
              }}
              style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {esRegistro ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FDFBF7', color: '#333333', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      
      <div style={{ width: '100%', maxWidth: '42rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={cerrarSesion}
            style={{ fontSize: '0.75rem', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
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
            style={{ width: '1.75rem', height: '1.75rem', borderRadius: '9999px', backgroundColor: 'white', border: '1px solid #F2E8DC', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem' }}
            title="Editar Mi Cuenta"
          >
            ⚙️
          </button>
        </div>

        {esAdmin && (
          <button
            type="button"
            onClick={() => setModoAdmin(!modoAdmin)}
            style={{ padding: '0.375rem 0.875rem', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '9999px', backgroundColor: '#8B0000', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            {modoAdmin ? '👤 Cambiar a Modo Usuario' : '👑 Cambiar a Modo Administrador'}
          </button>
        )}
      </div>

      {esAdmin && modoAdmin ? (
        <div style={{ width: '100%', maxWidth: '42rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #F2E8DC', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#8B0000', marginBottom: '1rem' }}>⚙️ Configuración del Intercambio</h2>
            
            <form onSubmit={guardarConfiguracionEvento} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Fecha y Hora del Intercambio</label>
                  <input
                    type="datetime-local"
                    value={normalizarFechaInput(fechaEvento)}
                    onChange={(e) => setFechaEvento(e.target.value)}
                    style={{ width: '100%', fontSize: '0.75rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Presupuesto Sugerido</label>
                  <input
                    type="text"
                    value={presupuesto}
                    onChange={(e) => setPresupuesto(e.target.value)}
                    placeholder="Ej. S/ 50 - S/ 100"
                    style={{ width: '100%', fontSize: '0.75rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button
                  type="submit"
                  style={{ backgroundColor: '#8B0000', color: 'white', padding: '0.625rem 1.25rem', borderRadius: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  💾 Guardar Cambios de Configuración
                </button>
              </div>
            </form>
          </section>

          <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #F2E8DC', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#8B0000', marginBottom: '0.25rem' }}>🎲 Estado del Sorteo</h2>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                {sorteoRealizado ? 'El sorteo se ha realizado con éxito.' : 'El sorteo está pendiente o se ejecutará al llegar la fecha.'}
              </p>
              <button
                type="button"
                onClick={ejecutarSorteoManual}
                style={{ backgroundColor: '#2E7D32', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                {sorteoRealizado ? '🔄 Re-ejecutar Sorteo' : '🎲 Iniciar Sorteo Ahora'}
              </button>
            </div>

            {sorteoRealizado && participantes.length > 0 && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#8B0000', marginBottom: '0.75rem' }}>🎁 Asignaciones de Amigos Secretos</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f3f4f6', color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.625rem' }}>
                        <th style={{ padding: '0.5rem 0' }}>Participante</th>
                        <th style={{ padding: '0.5rem 0' }}>Le regala a</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participantes.map((part) => {
                        const amigoAsignado = participantes.find(p => p.id === part.amigo_secreto_id);
                        return (
                          <tr key={part.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                            <td style={{ padding: '0.625rem 0', fontWeight: 600, color: '#1f2937' }}>
                              {part.nombre} {part.es_admin && <span style={{ fontSize: '0.625rem', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', marginLeft: '0.25rem' }}>Admin</span>}
                            </td>
                            <td style={{ padding: '0.625rem 0', color: '#8B0000', fontWeight: 'bold' }}>🎁 {amigoAsignado ? amigoAsignado.nombre : 'Pendiente'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #F2E8DC', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#8B0000' }}>👥 Participantes Registrados ({participantes.length})</h2>
              <button
                type="button"
                onClick={cargarParticipantes}
                style={{ fontSize: '0.75rem', color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                🔄 Actualizar Lista
              </button>
            </div>

            {participantes.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', padding: '1.5rem 0' }}>Aún no hay participantes registrados.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f3f4f6', color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.625rem' }}>
                      <th style={{ padding: '0.5rem 0' }}>Nombre</th>
                      <th style={{ padding: '0.5rem 0' }}>Celular</th>
                      <th style={{ padding: '0.5rem 0' }}>Clave Respaldo</th>
                      <th style={{ padding: '0.5rem 0', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantes.map((part) => (
                      <tr key={part.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '0.75rem 0', fontWeight: 600, color: '#1f2937' }}>
                          {part.nombre} {part.es_admin && <span style={{ fontSize: '0.625rem', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', marginLeft: '0.25rem' }}>Admin</span>}
                        </td>
                        <td style={{ padding: '0.75rem 0', color: '#4b5563' }}>{part.celular}</td>
                        <td style={{ padding: '0.75rem 0', color: '#9ca3af', fontFamily: 'monospace' }}>{part.clave_respaldo || '••••'}</td>
                        <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => abrirAdminEdit(part)}
                            style={{ backgroundColor: '#FAF6F0', color: '#8B0000', border: '1px solid #D4AF37', padding: '0.25rem 0.625rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.6875rem' }}
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
        <div style={{ width: '100%', maxWidth: '36rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', paddingBottom: '5rem' }}>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8B0000' }}>
              ¡Bienvenido, {nombreUsuario}! {esAdmin && <span style={{ fontSize: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.125rem 0.5rem', borderRadius: '9999px', marginLeft: '0.25rem', fontWeight: 600 }}>Administrador</span>}
            </h1>
          </div>

          <div>
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ width: '7rem', height: '7rem', borderRadius: '9999px', backgroundColor: '#FAF6F0', border: '2px dashed #D4AF37', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                {perfil?.foto_url ? (
                  <img src={perfil.foto_url} alt="Foto de Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem', display: 'block' }}>📷</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#6b7280' }}>Cargar Foto</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <section style={{ width: '100%', backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F2E8DC' }}>
            <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', color: '#8B0000', marginBottom: '1rem' }}>
              Mis Deseos
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
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
                  style={{ minHeight: '9.375rem', border: '2px dashed #D4AF37', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', cursor: 'pointer', backgroundColor: '#FAF6F0', position: 'relative', overflow: 'hidden' }}
                >
                  {deseo?.imagen ? (
                    <>
                      <div style={{ width: '100%', height: '4rem', position: 'relative', overflow: 'hidden', borderRadius: '0.75rem' }}>
                        <img src={deseo.imagen} alt={`Regalo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setImagenAmpliada(deseo.imagen);
                          }}
                          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.625rem', fontWeight: 'bold' }}
                        >
                          🔍 Ver
                        </div>
                      </div>

                      {deseo?.detalles && (
                        <p style={{ fontSize: '0.5625rem', color: '#4b5563', fontWeight: 500, textAlign: 'center', width: '100%', padding: '0 0.25rem', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '0.25rem' }}>
                          📝 {deseo.detalles}
                        </p>
                      )}

                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.25rem' }}>
                        {deseo?.url ? (
                          <a
                            href={deseo.url.startsWith('http') ? deseo.url : `https://${deseo.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', backgroundColor: '#8B0000', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.625rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                          >
                            🛒 Comprar
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.5625rem', color: '#9ca3af', fontWeight: 500 }}>Sin enlace</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', margin: 'auto' }}>
                      <span style={{ fontSize: '1.25rem', color: '#D4AF37', fontWeight: 'bold' }}>+</span>
                      <p style={{ fontSize: '0.625rem', fontWeight: 500, color: '#6b7280', marginTop: '0.25rem' }}>Opción {idx + 1}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {sorteoRealizado && (
            <section style={{ width: '100%', backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F2E8DC', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#8B0000', marginBottom: '0.5rem' }}>
                🎁 Tu Amigo Secreto
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                {cajaAbierta ? '¡Aquí tienes los detalles de la persona a quien le darás tu regalo!' : 'Haz clic en la caja sorpresa para revelar a quién te tocó y qué desea.'}
              </p>

              <div
                onClick={() => setCajaAbierta(true)}
                style={{ cursor: 'pointer', backgroundColor: '#FAF6F0', border: '2px dashed #D4AF37', borderRadius: '1.5rem', padding: '1.5rem', maxWidth: '28rem', margin: '0 auto', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              >
                {cajaAbierta ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '1.875rem', display: 'block' }}>🎉</span>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Te tocó regalar a:</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 'extrabold', color: '#8B0000' }}>
                        {amigoSecretoInfo ? amigoSecretoInfo.nombre : 'Cargando...'}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid #F2E8DC', paddingTop: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#8B0000', marginBottom: '0.5rem', textAlign: 'center' }}>🎁 Los deseos de tu amigo secreto:</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {amigoSecretoInfo?.deseos && amigoSecretoInfo.deseos.map((deseoAmigo, idx) => (
                          <div 
                            key={idx} 
                            style={{ minHeight: '10rem', backgroundColor: 'white', border: '1px solid #F2E8DC', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.375rem', overflow: 'hidden' }}
                          >
                            {deseoAmigo?.imagen ? (
                              <>
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setImagenAmpliada(deseoAmigo.imagen);
                                  }}
                                  style={{ width: '100%', height: '4rem', position: 'relative', overflow: 'hidden', borderRadius: '0.5rem', cursor: 'pointer' }}
                                >
                                  <img src={deseoAmigo.imagen} alt="Deseo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.5625rem', fontWeight: 'bold' }}>
                                    🔍 Ver
                                  </div>
                                </div>

                                {deseoAmigo?.detalles && (
                                  <p style={{ fontSize: '0.5625rem', color: '#374151', fontWeight: 500, textAlign: 'center', padding: '0.125rem', backgroundColor: '#f9fafb', borderRadius: '0.25rem' }}>
                                    📝 {deseoAmigo.detalles}
                                  </p>
                                )}

                                <div style={{ width: '100%', marginTop: '0.25rem' }}>
                                  {deseoAmigo?.url ? (
                                    <a
                                      href={deseoAmigo.url.startsWith('http') ? deseoAmigo.url : `https://${deseoAmigo.url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ width: '100%', backgroundColor: '#8B0000', color: 'white', padding: '0.25rem', borderRadius: '0.375rem', fontSize: '0.5625rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                                    >
                                      🛒 Enlace
                                    </a>
                                  ) : (
                                    <span style={{ fontSize: '0.5625rem', color: '#9ca3af', display: 'block', textAlign: 'center' }}>Sin enlace</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.625rem', color: '#9ca3af', textAlign: 'center', margin: 'auto' }}>Sin opción {idx + 1}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '2.25rem', display: 'block', marginBottom: '0.5rem' }}>🎁</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#8B0000', textTransform: 'uppercase', backgroundColor: 'white', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #D4AF37' }}>
                      Abrir Caja Sorpresa ✨
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          <footer style={{ width: '100%', textAlign: 'center', backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F2E8DC' }}>
            <div style={{ display: 'inline-block', backgroundColor: '#FAF6F0', border: '1px solid #D4AF37', color: '#8B0000', fontWeight: 600, fontSize: '0.75rem', padding: '0.375rem 1rem', borderRadius: '9999px', marginBottom: '1rem' }}>
              💰 Presupuesto sugerido: {presupuesto}
            </div>

            <p style={{ fontSize: '0.625rem', fontWeight: 'bold', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Fecha del Intercambio
            </p>
            <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#8B0000', marginBottom: '1rem' }}>
              {formatearFechaLegible(fechaEvento)}
            </p>

            {tiempoRestante.expirado ? (
              <div style={{ backgroundColor: '#FAF6F0', padding: '0.75rem', borderRadius: '1rem', border: '1px solid #D4AF37', color: '#8B0000', fontWeight: 'bold', fontSize: '0.875rem' }}>
                🎁 ¡Llegó el día del intercambio de regalos! 🎁
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', maxWidth: '20rem', margin: '0 auto' }}>
                <div style={{ backgroundColor: '#FAF6F0', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid #F2E8DC' }}>
                  <span style={{ display: 'block', fontSize: '1rem', fontWeight: 'bold', color: '#8B0000' }}>{tiempoRestante.dias}</span>
                  <span style={{ fontSize: '0.5625rem', color: '#6b7280', fontWeight: 500 }}>DÍAS</span>
                </div>
                <div style={{ backgroundColor: '#FAF6F0', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid #F2E8DC' }}>
                  <span style={{ display: 'block', fontSize: '1rem', fontWeight: 'bold', color: '#8B0000' }}>{tiempoRestante.horas}</span>
                  <span style={{ fontSize: '0.5625rem', color: '#6b7280', fontWeight: 500 }}>HORAS</span>
                </div>
                <div style={{ backgroundColor: '#FAF6F0', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid #F2E8DC' }}>
                  <span style={{ display: 'block', fontSize: '1rem', fontWeight: 'bold', color: '#8B0000' }}>{tiempoRestante.minutos}</span>
                  <span style={{ fontSize: '0.5625rem', color: '#6b7280', fontWeight: 500 }}>MINS</span>
                </div>
                <div style={{ backgroundColor: '#FAF6F0', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid #F2E8DC' }}>
                  <span style={{ display: 'block', fontSize: '1rem', fontWeight: 'bold', color: '#8B0000' }}>{tiempoRestante.segundos}</span>
                  <span style={{ fontSize: '0.5625rem', color: '#6b7280', fontWeight: 500 }}>SEGS</span>
                </div>
              </div>
            )}
          </footer>

        </div>
      )}

      {imagenAmpliada && (
        <div 
          onClick={() => setImagenAmpliada(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50, cursor: 'pointer' }}
        >
          <div style={{ position: 'relative', maxWidth: '42rem', maxHeight: '90vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setImagenAmpliada(null)}
              style={{ position: 'absolute', top: '-2.5rem', right: 0, backgroundColor: 'white', color: 'black', borderRadius: '9999px', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
            <img src={imagenAmpliada} alt="Imagen ampliada" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '1rem', border: '2px solid white' }} />
          </div>
        </div>
      )}

      {modalPerfilAbierto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', maxWidth: '22rem', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #F2E8DC' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1rem', color: '#8B0000', marginBottom: '1rem', textAlign: 'center' }}>
              Editar Mi Perfil
            </h3>

            <form onSubmit={guardarCambiosPerfilUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Teléfono / Celular</label>
                <input
                  type="text"
                  required
                  value={editCelular}
                  onChange={(e) => setEditCelular(e.target.value)}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Nueva Contraseña (Opcional)</label>
                <input
                  type="password"
                  placeholder="Dejar en blanco para no cambiar"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setModalPerfilAbierto(false)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '0.75rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#8B0000', color: 'white', borderRadius: '0.75rem', border: 'none', cursor: 'pointer' }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAdminEditAbierto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', maxWidth: '22rem', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #F2E8DC' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1rem', color: '#8B0000', marginBottom: '1rem', textAlign: 'center' }}>
              Corregir Participante
            </h3>

            <form onSubmit={guardarCambiosUsuarioPorAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={adminEditNombre}
                  onChange={(e) => setAdminEditNombre(e.target.value)}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Teléfono / Celular</label>
                <input
                  type="text"
                  required
                  value={adminEditCelular}
                  onChange={(e) => setAdminEditCelular(e.target.value)}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Restablecer Clave (Clave Respaldo)</label>
                <input
                  type="text"
                  required
                  value={adminEditPassword}
                  onChange={(e) => setAdminEditPassword(e.target.value)}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setModalAdminEditAbierto(false)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '0.75rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#8B0000', color: 'white', borderRadius: '0.75rem', border: 'none', cursor: 'pointer' }}
                >
                  Actualizar Datos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', maxWidth: '22rem', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #F2E8DC' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1rem', color: '#8B0000', marginBottom: '1rem', textAlign: 'center' }}>
              Agregar Opción {slotSeleccionado !== null ? slotSeleccionado + 1 : 1}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>
                  1. Foto del regalo
                </label>
                
                {regaloImagen ? (
                  <div style={{ position: 'relative', width: '100%', height: '7rem', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: '0.5rem' }}>
                    <img src={regaloImagen} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setRegaloImagen('')}
                      style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', backgroundColor: '#dc2626', color: 'white', borderRadius: '9999px', width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#FAF6F0', border: '2px dashed #D4AF37', borderRadius: '0.75rem', cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.125rem' }}>🖼️</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8B0000' }}>Abrir Galería de Fotos</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleRegaloImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>
                  2. Talla, Medidas o Detalles importantes
                </label>
                <input
                  type="text"
                  placeholder="Ej. Talla M, color azul, zapatilla 40"
                  value={regaloDetalles}
                  onChange={(e) => setRegaloDetalles(e.target.value)}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>
                  3. Enlace de compra (Opcional - URL)
                </label>
                <input
                  type="text"
                  placeholder="https://tienda.com/producto"
                  value={regaloUrl}
                  onChange={(e) => setRegaloUrl(e.target.value)}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '0.75rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarRegalo}
                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#8B0000', color: 'white', borderRadius: '0.75rem', border: 'none', cursor: 'pointer' }}
              >
                Guardar Regalo
              </button>
            </div>
          </div>
        </div>
      )}

      {sorteoRealizado && session && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 40, display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
          
          {amigoSecretoInfo && (
            <div style={{ position: 'relative' }}>
              {tieneNotifRegalo && !chatRegaloAbierto && (
                <span style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem', width: '1rem', height: '1rem', backgroundColor: '#dc2626', color: 'white', borderRadius: '9999px', fontSize: '0.5625rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, border: '2px solid white' }}>
                  !
                </span>
              )}

              {chatRegaloAbierto ? (
                <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #8B0000', width: '20rem', height: '24rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#8B0000', color: 'white', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      🎁 Chat con tu Amigo Secreto
                    </span>
                    <button
                      type="button"
                      onClick={() => setChatRegaloAbierto(false)}
                      style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#FAF6F0' }}>
                    {mensajesDB.filter(m => 
                      (m.remitente_id === session.user.id && m.destinatario_id === amigoSecretoInfo.id) ||
                      (m.remitente_id === amigoSecretoInfo.id && m.destinatario_id === session.user.id)
                    ).length === 0 ? (
                      <p style={{ fontSize: '0.6875rem', color: '#9ca3af', textAlign: 'center', marginTop: '2rem' }}>
                        Escribe aquí anónimamente a {amigoSecretoInfo.nombre} para darle pistas.
                      </p>
                    ) : (
                      mensajesDB.filter(m => 
                        (m.remitente_id === session.user.id && m.destinatario_id === amigoSecretoInfo.id) ||
                        (m.remitente_id === amigoSecretoInfo.id && m.destinatario_id === session.user.id)
                      ).map((msg, idx) => {
                        const esmio = msg.remitente_id === session.user.id;
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: esmio ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '80%', padding: '0.5rem', borderRadius: '0.75rem', fontSize: '0.75rem', backgroundColor: esmio ? '#8B0000' : 'white', color: esmio ? 'white' : '#1f2937', border: esmio ? 'none' : '1px solid #e5e7eb', borderBottomRightRadius: esmio ? 0 : '0.75rem', borderBottomLeftRadius: esmio ? '0.75rem' : 0 }}>
                              {msg.texto}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={enviarMensajeRegalo} style={{ padding: '0.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '0.375rem', backgroundColor: 'white' }}>
                    <input
                      type="text"
                      placeholder="Escribe un mensaje..."
                      value={mensajeRegalo}
                      onChange={(e) => setMensajeRegalo(e.target.value)}
                      style={{ flex: 1, fontSize: '0.75rem', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                    />
                    <button type="submit" style={{ backgroundColor: '#8B0000', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                      Enviar
                    </button>
                  </form>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={abrirChatRegalo}
                  style={{ width: '3.5rem', height: '3.5rem', backgroundColor: '#8B0000', color: 'white', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '2px solid white', cursor: 'pointer', fontSize: '1.25rem' }}
                  title="Chat: A quien regalo"
                >
                  🎁
                </button>
              )}
            </div>
          )}

          {personaQueMeRegalaInfo && (
            <div style={{ position: 'relative' }}>
              {tieneNotifAnoni && !chatAnoniAbierto && (
                <span style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem', width: '1rem', height: '1rem', backgroundColor: '#8B0000', color: 'white', borderRadius: '9999px', fontSize: '0.5625rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, border: '2px solid white' }}>
                  !
                </span>
              )}

              {chatAnoniAbierto ? (
                <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #D4AF37', width: '20rem', height: '24rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#D4AF37', color: 'white', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      ✨ Chat con tu Anónimo
                    </span>
                    <button
                      type="button"
                      onClick={() => setChatAnoniAbierto(false)}
                      style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#FAF6F0' }}>
                    {mensajesDB.filter(m => 
                      (m.remitente_id === session.user.id && m.destinatario_id === personaQueMeRegalaInfo.id) ||
                      (m.remitente_id === personaQueMeRegalaInfo.id && m.destinatario_id === session.user.id)
                    ).length === 0 ? (
                      <p style={{ fontSize: '0.6875rem', color: '#9ca3af', textAlign: 'center', marginTop: '2rem' }}>
                        Aquí recibirás mensajes de la persona secreta que te va a regalar.
                      </p>
                    ) : (
                      mensajesDB.filter(m => 
                        (m.remitente_id === session.user.id && m.destinatario_id === personaQueMeRegalaInfo.id) ||
                        (m.remitente_id === personaQueMeRegalaInfo.id && m.destinatario_id === session.user.id)
                      ).map((msg, idx) => {
                        const esmio = msg.remitente_id === session.user.id;
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: esmio ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '80%', padding: '0.5rem', borderRadius: '0.75rem', fontSize: '0.75rem', backgroundColor: esmio ? '#D4AF37' : 'white', color: esmio ? 'white' : '#1f2937', border: esmio ? 'none' : '1px solid #e5e7eb', borderBottomRightRadius: esmio ? 0 : '0.75rem', borderBottomLeftRadius: esmio ? '0.75rem' : 0 }}>
                              {msg.texto}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={enviarMensajeAnoni} style={{ padding: '0.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '0.375rem', backgroundColor: 'white' }}>
                    <input
                      type="text"
                      placeholder="Responde a tu anónimo..."
                      value={mensajeAnoni}
                      onChange={(e) => setMensajeAnoni(e.target.value)}
                      style={{ flex: 1, fontSize: '0.75rem', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none' }}
                    />
                    <button type="submit" style={{ backgroundColor: '#D4AF37', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                      Enviar
                    </button>
                  </form>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={abrirChatAnoni}
                  style={{ width: '3.5rem', height: '3.5rem', backgroundColor: '#D4AF37', color: 'white', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '2px solid white', cursor: 'pointer', fontSize: '1.25rem' }}
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