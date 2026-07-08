const SUPABASE_URL = "https://dudxwjaildagaqrfekra.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZHh3amFpbGRhZ2FxcmZla3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTc1OTYsImV4cCI6MjA5ODkzMzU5Nn0.I3n5F8jWzuerzyz_lB79hAtjlLx3qY7pxySzgep_lz4";

let config = { codigo_registro_docente: null };
let alumnoLogueado = null;
let listadoTrabajos = [];
let trabajoActualId = null;
let htmlEditor = null;
let cssEditor = null;
let jsEditor = null;

async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function cargarConfiguracion() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/configuracion?clave=eq.codigo_registro_docente&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.length > 0 && data[0].valor) {
        config.codigo_registro_docente = data[0].valor;
    }
}

function alternarVentanas(pantalla) {
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('regError').style.display = 'none';
    if (pantalla === 'REGISTRO') {
        document.getElementById('modalLogin').style.display = 'none';
        document.getElementById('modalRegistro').style.display = 'flex';
        cargarConfiguracion().then(() => {
            document.getElementById('registroCargando').style.display = 'none';
            document.getElementById('registroFormulario').style.display = 'block';
        });
    } else {
        document.getElementById('modalLogin').style.display = 'flex';
        document.getElementById('modalRegistro').style.display = 'none';
    }
}

function registrarEstudiante() {
    const cedula = document.getElementById('regCedula').value.trim();
    const apellidos = document.getElementById('regApellidos').value.toUpperCase().trim();
    const nombres = document.getElementById('regNombres').value.toUpperCase().trim();
    const paralelo = document.getElementById('regCurso').value;
    const contrasena = document.getElementById('regContrasena').value.trim();
    const codigoIngresado = document.getElementById('regCodigoClase').value.trim();
    const divError = document.getElementById('regError');

    if (!cedula || !apellidos || !nombres || !contrasena || !codigoIngresado) {
        divError.innerText = "❌ Todos los campos son obligatorios.";
        divError.style.display = 'block';
        return;
    }

    if (codigoIngresado !== config.codigo_registro_docente) {
        divError.innerText = "🔒 Código de registro incorrecto. Solicítalo a tu profesor en la pizarra.";
        divError.style.display = 'block';
        return;
    }

    fetch(`${SUPABASE_URL}/rest/v1/alumnos?cedula=eq.${encodeURIComponent(cedula)}&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        if (data.length > 0) {
            throw new Error("Esta cédula ya está registrada. Usá el login o recuperá tu contraseña.");
        }
        return hashPassword(contrasena, cedula);
    })
    .then(hashedPassword => {
        return fetch(`${SUPABASE_URL}/rest/v1/alumnos`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json', 'Prefer': 'return=representation'
            },
            body: JSON.stringify({ cedula, apellidos, nombres, paralelo, contrasena_hash: hashedPassword })
        });
    })
    .then(res => {
        if (!res.ok) return res.text().then(txt => { throw new Error(txt || `HTTP ${res.status}`); });
        return res.json();
    })
    .then(nuevoAlumno => {
        mostrarModalExito("🎉 ¡Registro completado con éxito! Ya puedes iniciar sesión.");
        alternarVentanas('LOGIN');
    })
    .catch(err => {
        divError.innerText = `❌ Error al guardar datos: ${err.message}`;
        divError.style.display = 'block';
        console.error(err);
    });
}

function loginEstudiante() {
    const cedula = document.getElementById('loginApellidos').value.trim();
    const contrasena = document.getElementById('loginContrasena').value.trim();
    const divError = document.getElementById('loginError');

    if (!cedula || !contrasena) {
        divError.style.display = 'block';
        return;
    }

    hashPassword(contrasena, cedula).then(hashedPassword => {
        return fetch(`${SUPABASE_URL}/rest/v1/alumnos?cedula=eq.${encodeURIComponent(cedula)}&contrasena_hash=eq.${encodeURIComponent(hashedPassword)}&limit=1`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        if (data.length > 0) {
            alumnoLogueado = data[0];
            document.getElementById('lblEstudiante').innerText = `Estudiante: ${alumnoLogueado.apellidos}, ${alumnoLogueado.nombres}`;
            document.getElementById('lblCurso').innerText = `(${alumnoLogueado.paralelo})`;
            document.getElementById('modalLogin').style.display = 'none';
            cargarEntregas();
            iniciarSincronizacion();
            actualizarVisibilidadFab();
        } else {
            divError.innerText = "❌ Credenciales incorrectas.";
            divError.style.display = 'block';
        }
    })
    .catch(err => {
        divError.innerText = `❌ Error al conectar con el servidor: ${err.message}`;
        divError.style.display = 'block';
        console.error(err);
    });
}

function actualizarSelectorProyectos() {
    const select = document.getElementById('selectProyecto');
    select.innerHTML = '<option value="">-- Selecciona un Proyecto --</option>';
    listadoTrabajos.forEach((trb, i) => {
        const option = document.createElement('option');
        option.value = trb.id;
        const estado = trb.estado || 'POR REVISAR';
        const icono = estado === 'REVISADO' ? '✅' : '⏳';
        option.textContent = `Proyecto #${listadoTrabajos.length - i} - ${icono} ${estado}`;
        if (trabajoActualId === trb.id) option.selected = true;
        select.appendChild(option);
    });
    actualizarBadgePendientes();
}

function actualizarBadgePendientes() {
    const badge = document.getElementById('badgePendientes');
    if (!badge) return;
    const pendientes = listadoTrabajos.filter(t => {
        const estado = (t.estado || '').toUpperCase().trim();
        return estado !== 'REVISADO';
    }).length;
    badge.textContent = `📋 Pendientes: ${pendientes}`;
    if (pendientes > 0) {
        badge.classList.remove('oculto');
    } else {
        badge.classList.add('oculto');
    }
}

function cargarEntregas() {
    fetch(`${SUPABASE_URL}/rest/v1/entregas_tareas?alumno_id=eq.${alumnoLogueado.id}&order=id.desc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        listadoTrabajos = data || [];
        actualizarSelectorProyectos();
        actualizarBadgePendientes();
        if(listadoTrabajos.length > 0) {
            const existe = listadoTrabajos.find(t => t.id === trabajoActualId);
            if (existe) cargarTrabajoEspecifico(existe);
            else cargarTrabajoEspecifico(listadoTrabajos[0]);
        } else crearNuevoTrabajo();
    })
    .catch(err => {
        mostrarModalError(`❌ No se pudieron cargar tus entregas: ${err.message}`);
        console.error(err);
    });
}

function sincronizarEntregas() {
    if (!alumnoLogueado) return;
    fetch(`${SUPABASE_URL}/rest/v1/entregas_tareas?alumno_id=eq.${alumnoLogueado.id}&order=id.desc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        const nuevas = data || [];
        const actualizadas = [];
        nuevas.forEach(nueva => {
            const anterior = listadoTrabajos.find(t => t.id === nueva.id);
            if (!anterior || anterior.updated_at !== nueva.updated_at) {
                actualizadas.push(nueva);
            }
        });
        if (actualizadas.length > 0) {
            listadoTrabajos = nuevas;
            actualizarSelectorProyectos();
            actualizadas.forEach(actualizada => {
                if (actualizada.id === trabajoActualId) {
                    cargarTrabajoEspecifico(actualizada);
                    mostrarIndicadorActualizacion();
                }
            });
            actualizarBadgePendientes();
        }
    })
    .catch(err => console.error("Error en sincronización:", err));
}

function mostrarIndicadorActualizacion() {
    const header = document.querySelector('header');
    header.style.transition = 'background-color 0.3s';
    header.style.backgroundColor = '#27ae60';
    setTimeout(() => { header.style.backgroundColor = '#2c3e50'; }, 1500);
}

function iniciarSincronizacion() {
    setInterval(sincronizarEntregas, 5000);
}

function cargarTrabajoEspecifico(trb) {
    trabajoActualId = trb.id;
    actualizarSelectorProyectos();
    if (htmlEditor) htmlEditor.setValue(trb.codigo_html || '');
    if (cssEditor) cssEditor.setValue(trb.codigo_css || '');
    if (jsEditor) jsEditor.setValue(trb.codigo_js || '');
    document.getElementById('txtObservaciones').innerText = trb.observaciones || "Sin comentarios del docente todavía.";

    const bloquear = trb.estado === "REVISADO";
    const txts = [document.getElementById('txtHtml'), document.getElementById('txtCss'), document.getElementById('txtJs')];
    txts.forEach(t => { t.readOnly = bloquear; if (bloquear) t.classList.add('bloqueado'); else t.classList.remove('bloqueado'); });

    const btn = document.getElementById('btnGuardar');
    btn.disabled = bloquear;
    btn.innerText = bloquear ? "🔒 Proyecto Bloqueado" : "💾 Guardar y Enviar";
    renderLive();
}

function cambiarProyectoDesdeSelect() {
    const select = document.getElementById('selectProyecto');
    const idSeleccionado = select.value;
    if (!idSeleccionado) return;
    const trb = listadoTrabajos.find(t => t.id == idSeleccionado);
    if (trb) cargarTrabajoEspecifico(trb);
}

function crearNuevoTrabajo() {
    const html = document.getElementById('txtHtml').value.trim();
    const css = document.getElementById('txtCss').value.trim();
    const js = document.getElementById('txtJs').value.trim();
    if (html || css || js) {
        mostrarModalConfirmacion("¿Deseas descartar el proyecto actual y crear uno nuevo?", () => {
            trabajoActualId = null;
            actualizarSelectorProyectos();
            if (htmlEditor) htmlEditor.setValue("<!-- Estructura tu HTML -->");
            if (cssEditor) cssEditor.setValue("/* Estilos CSS */");
            if (jsEditor) jsEditor.setValue("// Código JS");
            document.getElementById('txtObservaciones').innerText = "Guarda este nuevo trabajo para enviarlo a revisión.";

            const txts = [document.getElementById('txtHtml'), document.getElementById('txtCss'), document.getElementById('txtJs')];
            txts.forEach(t => { t.readOnly = false; t.classList.remove('bloqueado'); });

            const btn = document.getElementById('btnGuardar');
            btn.disabled = false; btn.innerText = "💾 Guardar Nuevo Proyecto";
            renderLive();
        });
        return;
    }
    trabajoActualId = null;
    actualizarSelectorProyectos();
    if (htmlEditor) htmlEditor.setValue("<!-- Estructura tu HTML -->");
    if (cssEditor) cssEditor.setValue("/* Estilos CSS */");
    if (jsEditor) jsEditor.setValue("// Código JS");
    document.getElementById('txtObservaciones').innerText = "Guarda este nuevo trabajo para enviarlo a revisión.";

    const txts = [document.getElementById('txtHtml'), document.getElementById('txtCss'), document.getElementById('txtJs')];
    txts.forEach(t => { t.readOnly = false; t.classList.remove('bloqueado'); });

    const btn = document.getElementById('btnGuardar');
    btn.disabled = false; btn.innerText = "💾 Guardar Nuevo Proyecto";
    renderLive();
}

function guardarProyectoSupabase() {
    const html = htmlEditor ? htmlEditor.getValue() : document.getElementById('txtHtml').value;
    const css = cssEditor ? cssEditor.getValue() : document.getElementById('txtCss').value;
    const js = jsEditor ? jsEditor.getValue() : document.getElementById('txtJs').value;
    const payload = {
        alumno_id: alumnoLogueado.id,
        codigo_html: html,
        codigo_css: css,
        codigo_js: js,
        estado: "POR REVISAR",
        updated_at: new Date().toISOString()
    };

    const esEdicion = trabajoActualId !== null;
    const url = esEdicion ? `${SUPABASE_URL}/rest/v1/entregas_tareas?id=eq.${trabajoActualId}` : `${SUPABASE_URL}/rest/v1/entregas_tareas`;

    fetch(url, {
        method: esEdicion ? 'PATCH' : 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json', 'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) return res.text().then(txt => { throw new Error(txt || `HTTP ${res.status}`); });
        return res.json();
    })
    .then(() => {
        mostrarToast('🚀 ¡Entrega guardada con éxito!', 'success');
        cargarEntregas();
    })
    .catch(err => {
        mostrarModalError(`❌ No se pudo guardar la entrega: ${err.message}`);
        console.error(err);
    });
}

function renderLive() {
    const html = htmlEditor ? htmlEditor.getValue() : document.getElementById('txtHtml').value;
    const css = cssEditor ? cssEditor.getValue() : document.getElementById('txtCss').value;
    const js = jsEditor ? jsEditor.getValue() : document.getElementById('txtJs').value;
    const iframe = document.getElementById('vpIframe');
    const src = '<!DOCTYPE html><html><head><style>' + css + '</style></head><body>' + html + '<script>' + js + '<\/script></body></html>';
    iframe.srcdoc = src;
}

function toggleMenuMovil() {
    const menu = document.getElementById('menuMovil');
    if (menu) menu.classList.toggle('activo');
}

function toggleMenuDrawer() {
    const drawer = document.getElementById('menuDrawer');
    const overlay = document.getElementById('menuDrawerOverlay');
    if (drawer && overlay) {
        const activo = drawer.classList.contains('activo');
        if (activo) {
            drawer.classList.remove('activo');
            overlay.classList.remove('activo');
        } else {
            drawer.classList.add('activo');
            overlay.classList.add('activo');
            actualizarHeaderDrawer();
        }
    }
}

function cerrarMenuDrawer() {
    const drawer = document.getElementById('menuDrawer');
    const overlay = document.getElementById('menuDrawerOverlay');
    if (drawer) drawer.classList.remove('activo');
    if (overlay) overlay.classList.remove('activo');
}

function actualizarHeaderDrawer() {
    const lblEst = document.getElementById('lblEstudianteDrawer');
    const lblCur = document.getElementById('lblCursoDrawer');
    if (lblEst && alumnoLogueado) lblEst.innerText = `${alumnoLogueado.apellidos}, ${alumnoLogueado.nombres}`;
    if (lblCur && alumnoLogueado) lblCur.innerText = alumnoLogueado.paralelo || '';
}

function abrirPaginaCompleta() {
    cerrarMenuDrawer();
    window.open(window.location.href, '_blank', 'noopener');
}

function cambiarPestana(tipo, el) {
    document.querySelectorAll('.pestana').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.panel-editor').forEach(p => p.classList.remove('activo'));
    el.classList.add('activa');
    const mapa = { html: 'panelHtml', css: 'panelCss', js: 'panelJs', vista: 'panelVista' };
    const panel = document.getElementById(mapa[tipo]);
    if (panel) panel.classList.add('activo');
    if (tipo === 'vista') renderLive();

    if (htmlEditor) { htmlEditor.refresh(); if (tipo === 'html') htmlEditor.focus(); }
    if (cssEditor) { cssEditor.refresh(); if (tipo === 'css') cssEditor.focus(); }
    if (jsEditor) { jsEditor.refresh(); if (tipo === 'js') jsEditor.focus(); }
}

function inicializarCodeMirror() {
    if (typeof CodeMirror === 'undefined') return;

    const panels = ['panelHtml', 'panelCss', 'panelJs'];
    panels.forEach(id => {
        const panel = document.getElementById(id);
        if (panel) panel.style.visibility = 'visible';
    });

    htmlEditor = CodeMirror.fromTextArea(document.getElementById('txtHtml'), {
        mode: 'htmlmixed',
        lineNumbers: true,
        extraKeys: {"Ctrl-Space": "autocomplete", "Tab": "autocomplete"},
        hintOptions: { completeSingle: false }
    });
    htmlEditor.on('change', renderLive);

    cssEditor = CodeMirror.fromTextArea(document.getElementById('txtCss'), {
        mode: 'css',
        lineNumbers: true,
        extraKeys: {"Ctrl-Space": "autocomplete", "Tab": "autocomplete"},
        hintOptions: { completeSingle: false }
    });
    cssEditor.on('change', renderLive);

    jsEditor = CodeMirror.fromTextArea(document.getElementById('txtJs'), {
        mode: 'javascript',
        lineNumbers: true,
        extraKeys: {"Ctrl-Space": "autocomplete", "Tab": "autocomplete"},
        hintOptions: { completeSingle: false }
    });
    jsEditor.on('change', renderLive);

    if (htmlEditor) htmlEditor.refresh();
    if (cssEditor) cssEditor.refresh();
    if (jsEditor) jsEditor.refresh();

    renderLive();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarCodeMirror);
} else {
    inicializarCodeMirror();
}

function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerText = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function mostrarModalConfirmacion(mensaje, onConfirmar) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-card">
            <h3>Confirmar</h3>
            <p>${mensaje}</p>
            <div class="modal-actions">
                <button class="modal-btn-secondary" id="btnCancelarModal">Cancelar</button>
                <button class="modal-btn-primary" id="btnConfirmarModal">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('visible'), 10);

    overlay.querySelector('#btnCancelarModal').onclick = () => overlay.remove();
    overlay.querySelector('#btnConfirmarModal').onclick = () => { onConfirmar(); overlay.remove(); };
}

function mostrarModalExito(mensaje) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-card">
            <h3 style="color:#27ae60;">✅ Éxito</h3>
            <p>${mensaje}</p>
            <div class="modal-actions">
                <button class="modal-btn-success" id="btnCerrarModalExito">Aceptar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('visible'), 10);
    overlay.querySelector('#btnCerrarModalExito').onclick = () => overlay.remove();
}

function mostrarModalError(mensaje) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-card">
            <h3 style="color:#c0392b;">❌ Error</h3>
            <p>${mensaje}</p>
            <div class="modal-actions">
                <button class="modal-btn-danger" id="btnCerrarModalError">Entendido</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('visible'), 10);
    overlay.querySelector('#btnCerrarModalError').onclick = () => overlay.remove();
}

function mostrarModalCambiarContrasena() {
    document.getElementById('modalCambiarContrasena').style.display = 'flex';
    document.getElementById('cambioContrasenaActual').value = '';
    document.getElementById('cambioContrasenaNueva').value = '';
    document.getElementById('cambioContrasenaConfirmar').value = '';
    document.getElementById('cambioError').style.display = 'none';
}

function ocultarModalCambiarContrasena() {
    document.getElementById('modalCambiarContrasena').style.display = 'none';
}

function cerrarSesion() {
    mostrarModalConfirmacion("¿Estás seguro de que quieres cerrar sesión?", () => {
        alumnoLogueado = null;
        listadoTrabajos = [];
        trabajoActualId = null;
        document.getElementById('modalLogin').style.display = 'flex';
        document.getElementById('lblEstudiante').innerText = 'Estudiante: Cargando...';
        document.getElementById('lblCurso').innerText = '';
        document.getElementById('loginApellidos').value = '';
        document.getElementById('loginContrasena').value = '';
        mostrarToast('Sesión cerrada correctamente', 'info');
        actualizarVisibilidadFab();
    });
}

function actualizarVisibilidadFab() {
    const fab = document.getElementById('fabMenu');
    if (fab) {
        fab.style.display = alumnoLogueado ? 'flex' : 'none';
        if (!alumnoLogueado) fab.classList.remove('activo');
    }
}

function toggleMenuFab() {
    const fab = document.getElementById('fabMenu');
    if (fab) fab.classList.toggle('activo');
}

function cerrarMenuFab() {
    const fab = document.getElementById('fabMenu');
    if (fab) fab.classList.remove('activo');
}

function abrirPaginaCompleta() {
    cerrarMenuFab();
    window.open(window.location.href, '_blank', 'noopener');
}

function cambiarContrasena() {
    const actual = document.getElementById('cambioContrasenaActual').value.trim();
    const nueva = document.getElementById('cambioContrasenaNueva').value.trim();
    const confirmar = document.getElementById('cambioContrasenaConfirmar').value.trim();
    const divError = document.getElementById('cambioError');

    if (!actual || !nueva || !confirmar) {
        divError.innerText = "❌ Todos los campos son obligatorios.";
        divError.style.display = 'block';
        return;
    }

    if (nueva !== confirmar) {
        divError.innerText = "❌ La nueva contraseña no coincide.";
        divError.style.display = 'block';
        return;
    }

    if (nueva.length < 4) {
        divError.innerText = "❌ La contraseña debe tener al menos 4 caracteres.";
        divError.style.display = 'block';
        return;
    }

    hashPassword(actual, alumnoLogueado.cedula).then(hashedActual => {
        return fetch(`${SUPABASE_URL}/rest/v1/alumnos?cedula=eq.${encodeURIComponent(alumnoLogueado.cedula)}&contrasena_hash=eq.${encodeURIComponent(hashedActual)}&limit=1`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        if (data.length === 0) {
            throw new Error("La contraseña actual es incorrecta.");
        }
        return hashPassword(nueva, alumnoLogueado.cedula);
    })
    .then(hashedNueva => {
        return fetch(`${SUPABASE_URL}/rest/v1/alumnos?id=eq.${alumnoLogueado.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json', 'Prefer': 'return=representation'
            },
            body: JSON.stringify({ contrasena_hash: hashedNueva })
        });
    })
    .then(res => {
        if (!res.ok) return res.text().then(txt => { throw new Error(txt || `HTTP ${res.status}`); });
        return res.json();
    })
    .then(() => {
        ocultarModalCambiarContrasena();
        mostrarModalExito("Contraseña actualizada con éxito.");
    })
    .catch(err => {
        divError.innerText = `❌ ${err.message}`;
        divError.style.display = 'block';
        console.error(err);
    });
}

function abrirPaginaCompleta() {
    cerrarMenuFab();
    window.open(window.location.href, '_blank', 'noopener');
}

actualizarVisibilidadFab();
