const SUPABASE_URL = "https://dudxwjaildagaqrfekra.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZHh3amFpbGRhZ2FxcmZla3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTc1OTYsImV4cCI6MjA5ODkzMzU5Nn0.I3n5F8jWzuerzyz_lB79hAtjlLx3qY7pxySzgep_lz4";
const CLAVE_MAESTRA_DOCENTE = "Albertina2026";

let alumnos = [];
let entregas = [];
let alumnoSeleccionado = null;
let entregaSeleccionada = null;
let pestañaActiva = 'HTML';
let idsAlumnosConocidos = new Set();
let idsEntregasConocidas = new Set();

function loginDocente() {
    const claveIngresada = document.getElementById('txtClaveMaestra').value.trim();
    const divError = document.getElementById('loginError');
    console.log('[DOCENTE] loginDocente ejecutado, claveIngresada:', claveIngresada);

    if(claveIngresada === CLAVE_MAESTRA_DOCENTE) {
        console.log('[DOCENTE] Clave correcta, ocultando modal');
        const modal = document.getElementById('modalLoginDocente');
        console.log('[DOCENTE] modal encontrado:', !!modal);
        modal.style.display = 'none';
        cargarAlumnos();
        iniciarSincronizacionDocente();
    } else {
        console.log('[DOCENTE] Clave incorrecta');
        divError.style.display = 'block';
    }
}

function cargarAlumnos() {
    const curso = document.getElementById('filtroCurso').value;
    fetch(`${SUPABASE_URL}/rest/v1/alumnos?paralelo=eq.${encodeURIComponent(curso)}&order=apellidos.asc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    })
    .then(res => res.json())
    .then(data => {
        alumnos = data || [];
        console.log('[DOCENTE] alumnos cargados:', alumnos.length, alumnos);
        idsAlumnosConocidos = new Set(alumnos.map(a => a.id));
        
        Promise.all(alumnos.map(al => 
            fetch(`${SUPABASE_URL}/rest/v1/entregas_tareas?alumno_id=eq.${al.id}&order=id.desc`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            })
            .then(res => res.json())
            .then(entregas => {
                al.entregas = entregas || [];
            })
            .catch(() => { al.entregas = []; })
        )).then(() => {
            renderAlumnos();
            limpiarVistaTrabajo();
        });
    });
}

function sincronizarAlumnos() {
    const curso = document.getElementById('filtroCurso').value;
    fetch(`${SUPABASE_URL}/rest/v1/alumnos?paralelo=eq.${encodeURIComponent(curso)}&order=apellidos.asc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    })
    .then(res => res.json())
    .then(data => {
        const nuevosAlumnos = data || [];
        const hayNuevos = nuevosAlumnos.some(a => !idsAlumnosConocidos.has(a.id));
        
        alumnos = nuevosAlumnos;
        
        Promise.all(alumnos.map(al => 
            fetch(`${SUPABASE_URL}/rest/v1/entregas_tareas?alumno_id=eq.${al.id}&order=id.desc`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            })
            .then(res => res.json())
            .then(entregas => {
                al.entregas = entregas || [];
            })
            .catch(() => { al.entregas = []; })
        )).then(() => {
            renderAlumnos();
        });
        
        if (hayNuevos) {
            const cantidad = nuevosAlumnos.filter(a => !idsAlumnosConocidos.has(a.id)).length;
            mostrarToast(`📢 ${cantidad} estudiante(s) nuevo(s) registrado(s)`, 'info');
            resaltarHeader('#f39c12');
        }
    })
    .catch(err => console.error("Error en sincronización de alumnos:", err));
}

function sincronizarEntregas() {
    if (!alumnoSeleccionado) return;
    fetch(`${SUPABASE_URL}/rest/v1/entregas_tareas?alumno_id=eq.${alumnoSeleccionado.id}&order=id.desc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    })
    .then(res => res.json())
    .then(data => {
        const nuevasEntregas = data || [];
        const entregasActualizadas = nuevasEntregas.filter(e => {
            const anterior = entregas.find(ant => ant.id === e.id);
            return !anterior || anterior.updated_at !== e.updated_at;
        });
        if (entregasActualizadas.length > 0) {
            entregas = nuevasEntregas;
            renderEntregas();
            resaltarHeader('#27ae60');
            
            if (alumnoSeleccionado) {
                alumnoSeleccionado.entregas = nuevasEntregas;
                renderAlumnos();
            }
            
            if (entregaSeleccionada) {
                const actualizada = entregasActualizadas.find(e => e.id === entregaSeleccionada.id);
                if (actualizada) {
                    cargarProyectoEnVisor(actualizada);
                }
            }
        }
    })
    .catch(err => console.error("Error en sincronización de entregas:", err));
}

function resaltarHeader(color) {
    const header = document.querySelector('header');
    header.style.transition = 'background-color 0.3s';
    header.style.backgroundColor = color;
    setTimeout(() => { header.style.backgroundColor = '#2c3e50'; }, 2000);
}

function iniciarSincronizacionDocente() {
    setInterval(sincronizarAlumnos, 5000);
    setInterval(sincronizarEntregas, 5000);
}

function renderAlumnos() {
    const contenedor = document.getElementById('listaAlumnos');
    console.log('[DOCENTE] renderAlumnos, contenedor:', !!contenedor, 'alumnos:', alumnos.length);
    if (!contenedor) return;
    contenedor.innerHTML = "";

    if(alumnos.length === 0) {
        contenedor.innerHTML = `<p style="padding: 15px; font-size:13px; color:#95a5a6; text-align:center;">Ningún alumno registrado en este paralelo.</p>`;
        return;
    }

    alumnos.forEach(al => {
        const esNuevo = !idsAlumnosConocidos.has(al.id);
        const pendientes = (al.entregas || []).filter(e => e.estado !== 'REVISADO').length;
        const badgePendientes = pendientes > 0 
            ? `<span class="badge badge-pendiente" style="margin-left:8px;">📋 ${pendientes}</span>` 
            : '';
        
        const div = document.createElement('div');
        div.className = `item-alumno ${alumnoSeleccionado && alumnoSeleccionado.id === al.id ? 'seleccionado' : ''} ${esNuevo ? 'item-nuevo' : ''}`;
        div.innerHTML = `<div class="alumno-nombre">${al.apellidos}, ${al.nombres} ${badgePendientes}</div>
                         <div class="alumno-detalles">🔑 Contraseña: <b>${al.contrasena || 'S/N'}</b></div>
                         <div style="margin-top:5px; display:flex; gap:5px; flex-wrap:wrap;">
                            <button class="btn-docente btn-revisar" style="font-size:10px; padding:4px 8px;" onclick="editarAlumno(${al.id})">✏️ Editar</button>
                            <button class="btn-docente btn-desbloquear" style="font-size:10px; padding:4px 8px; background-color:#c0392b;" onclick="eliminarAlumno(${al.id})">🗑️ Eliminar</button>
                            <button class="btn-docente" style="font-size:10px; padding:4px 8px; background-color:#8e44ad;" onclick="resetarClaveAlumno(${al.id})">🔑 Reset</button>
                         </div>`;
        div.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') seleccionarAlumno(al);
        };
        contenedor.appendChild(div);
    });

    idsAlumnosConocidos = new Set(alumnos.map(a => a.id));
}

function seleccionarAlumno(al) {
    alumnoSeleccionado = al;
    renderAlumnos();
    document.getElementById('listaProyectos').innerHTML = `<p style="padding: 15px; font-size:12px; color:#7f8c8d;">Buscando entregas...</p>`;
    fetch(`${SUPABASE_URL}/rest/v1/entregas_tareas?alumno_id=eq.${al.id}&order=id.desc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    })
    .then(res => res.json())
    .then(data => {
        entregas = data || [];
        idsEntregasConocidas = new Set(entregas.map(e => e.id));
        renderEntregas();
    });
}

function renderEntregas() {
    const ul = document.getElementById('listaProyectos');
    ul.innerHTML = "";
    if(entregas.length === 0) {
        ul.innerHTML = `<p style="padding: 15px; font-size:12px; color:#95a5a6; text-align:center;">El estudiante no ha enviado proyectos.</p>`;
        limpiarVistaTrabajo();
        return;
    }
    entregas.forEach((ent, index) => {
        const esNueva = !idsEntregasConocidas.has(ent.id);
        const li = document.createElement('li');
        li.className = `item-entrega ${entregaSeleccionada && entregaSeleccionada.id === ent.id ? 'seleccionada' : ''} ${esNueva ? 'entrega-nueva' : ''}`;
        const badgeClass = ent.estado === 'REVISADO' ? 'badge-revisado' : 'badge-pendiente';
        const badgeTexto = ent.estado === 'REVISADO' ? 'Revisado' : 'Pendiente';
        li.innerHTML = `<span>Proyecto #${entregas.length - index}</span>
                        <span class="badge ${badgeClass}">${badgeTexto}</span>`;
        li.onclick = () => cargarProyectoEnVisor(ent);
        ul.appendChild(li);
    });
    idsEntregasConocidas = new Set(entregas.map(e => e.id));
}

function cargarProyectoEnVisor(ent) {
    entregaSeleccionada = ent;
    renderEntregas();
    document.getElementById('vistaVacia').style.display = 'none';
    document.getElementById('vistaTrabajo').style.display = 'flex';
    document.getElementById('lblEvaluacion').innerText = `Retroalimentación para: ${alumnoSeleccionado.apellidos} (Proyecto ID: ${ent.id})`;
    document.getElementById('txtObservacionesDocente').value = ent.observaciones || "";
    const lblEstado = document.getElementById('lblEstadoProyecto');
    lblEstado.innerText = ent.estado || "POR REVISAR";
    lblEstado.className = `badge ${ent.estado === 'REVISADO' ? 'badge-revisado' : 'badge-pendiente'}`;
    cambiarPestaña(pestañaActiva);
    renderIframe();
}

function cambiarPestaña(tipo) {
    pestañaActiva = tipo;
    const botones = ['btnHtml', 'btnCss', 'btnJs', 'btnVista'];
    botones.forEach(id => document.getElementById(id).classList.remove('activo'));
    const editor = document.getElementById('editorCodigo');
    const panelVista = document.getElementById('panelVista');
    if (tipo === 'VISTA') {
        document.getElementById('btnVista').classList.add('activo');
        editor.style.display = 'none';
        panelVista.classList.add('activo');
        renderIframe();
    } else {
        const btn = document.getElementById('btn' + tipo);
        if (btn) btn.classList.add('activo');
        editor.style.display = 'block';
        panelVista.classList.remove('activo');
        if(tipo === 'HTML') editor.textContent = entregaSeleccionada.codigo_html || '<!-- Sin código HTML -->';
        else if(tipo === 'CSS') editor.textContent = entregaSeleccionada.codigo_css || '/* Sin código CSS */';
        else if(tipo === 'JS') editor.textContent = entregaSeleccionada.codigo_js || '// Sin código JavaScript';
    }
}

function renderIframe() {
    const iframe = document.getElementById('previewIframe');
    const html = entregaSeleccionada.codigo_html || '';
    const css = entregaSeleccionada.codigo_css || '';
    const js = entregaSeleccionada.codigo_js || '';
    const src = '<!DOCTYPE html><html><head><style>' + css + '</style></head><body>' + html + '<script>' + js + '<\/script></body></html>';
    iframe.srcdoc = src;
}

function actualizarEstadoEntrega(nuevoEstado) {
    if(!entregaSeleccionada) return;
    const observaciones = document.getElementById('txtObservacionesDocente').value;
    const payload = { estado: nuevoEstado, observaciones: observaciones, updated_at: new Date().toISOString() };
    fetch(`${SUPABASE_URL}/rest/v1/entregas_tareas?id=eq.${entregaSeleccionada.id}`, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if(!res.ok) throw new Error("Error al guardar revisión");
        mostrarToast(`Proyecto actualizado a: ${nuevoEstado}`, 'success');
        entregaSeleccionada.estado = nuevoEstado;
        entregaSeleccionada.observaciones = observaciones;
        seleccionarAlumno(alumnoSeleccionado);
        cargarProyectoEnVisor(entregaSeleccionada);
    })
    .catch(err => {
        mostrarModalError("Ocurrió un error al guardar la calificación.");
        console.error(err);
    });
}

function limpiarVistaTrabajo() {
    entregaSeleccionada = null;
    document.getElementById('listaProyectos').innerHTML = "";
    document.getElementById('vistaVacia').style.display = 'flex';
    document.getElementById('vistaTrabajo').style.display = 'none';
}

function cargarFormularioAlumno(alumno = null) {
    document.getElementById('editarIdAlumno').value = alumno ? alumno.id : '';
    document.getElementById('editarCedula').value = alumno ? alumno.cedula : '';
    document.getElementById('editarApellidos').value = alumno ? alumno.apellidos : '';
    document.getElementById('editarNombres').value = alumno ? alumno.nombres : '';
    document.getElementById('editarParalelo').value = alumno ? alumno.paralelo : document.getElementById('filtroCurso').value;
    document.getElementById('btnGuardarAlumno').innerText = alumno ? '💾 Actualizar' : '➕ Crear';
    document.getElementById('btnCancelarEdicion').style.display = alumno ? 'block' : 'none';
    document.getElementById('formularioEdicion').style.display = alumno ? 'block' : 'none';
}

function toggleFormularioEdicion() {
    const formulario = document.getElementById('formularioEdicion');
    formulario.style.display = formulario.style.display === 'none' ? 'block' : 'none';
}

function guardarAlumno() {
    const id = document.getElementById('editarIdAlumno').value;
    const cedula = document.getElementById('editarCedula').value.trim();
    const apellidos = document.getElementById('editarApellidos').value.trim().toUpperCase();
    const nombres = document.getElementById('editarNombres').value.trim().toUpperCase();
    const paralelo = document.getElementById('editarParalelo').value;
    if (!cedula || !apellidos || !nombres) {
        mostrarModalError("Cédula, apellidos y nombres son obligatorios.");
        return;
    }
    const esEdicion = !!id;
    const url = esEdicion ? `${SUPABASE_URL}/rest/v1/alumnos?id=eq.${id}` : `${SUPABASE_URL}/rest/v1/alumnos`;
    const metodo = esEdicion ? 'PATCH' : 'POST';
    fetch(url, {
        method: metodo,
        headers: {
            'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json', 'Prefer': 'return=representation'
        },
        body: JSON.stringify({ cedula, apellidos, nombres, paralelo })
    })
    .then(res => {
        if (!res.ok) return res.text().then(txt => { throw new Error(txt || `HTTP ${res.status}`); });
        return res.json();
    })
    .then(() => {
        mostrarToast(esEdicion ? 'Alumno actualizado correctamente.' : 'Alumno creado correctamente.', 'success');
        cargarFormularioAlumno(null);
        cargarAlumnos();
    })
    .catch(err => {
        mostrarModalError(`Error al guardar alumno: ${err.message}`);
        console.error(err);
    });
}

function editarAlumno(id) {
    const alumno = alumnos.find(a => a.id === id);
    if (alumno) cargarFormularioAlumno(alumno);
}

function eliminarAlumno(id) {
    mostrarModalConfirmacion("¿Estás seguro de que deseas eliminar este estudiante? Esta acción no se puede deshacer.", () => {
        fetch(`${SUPABASE_URL}/rest/v1/alumnos?id=eq.${id}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(() => {
            mostrarToast('Alumno eliminado correctamente.', 'success');
            if (alumnoSeleccionado && alumnoSeleccionado.id === id) {
                alumnoSeleccionado = null;
                limpiarVistaTrabajo();
            }
            cargarAlumnos();
        })
        .catch(err => {
            mostrarModalError(`Error al eliminar alumno: ${err.message}`);
            console.error(err);
        });
    });
}

function cancelarEdicionAlumno() {
    cargarFormularioAlumno(null);
}

async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function resetarClaveAlumno(id) {
    const alumno = alumnos.find(a => a.id === id);
    if (!alumno) return;
    mostrarModalConfirmacion(`¿Resetear la contraseña de ${alumno.apellidos}, ${alumno.nombres}? Se establecerá en "123456".`, async () => {
        try {
            const hashedPassword = await hashPassword("123456", alumno.cedula);
            const res = await fetch(`${SUPABASE_URL}/rest/v1/alumnos?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ contrasena_hash: hashedPassword })
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || `HTTP ${res.status}`);
            }
            mostrarToast(`Contraseña reseteada a 123456 para ${alumno.apellidos}, ${alumno.nombres}`, 'success');
        } catch (err) {
            mostrarModalError(`Error al resetear contraseña: ${err.message}`);
            console.error(err);
        }
    });
}

function analizarYGenerarRetroalimentacion() {
    if (!entregaSeleccionada) return;
    const html = entregaSeleccionada.codigo_html || '';
    const css = entregaSeleccionada.codigo_css || '';
    const js = entregaSeleccionada.codigo_js || '';
    const resultados = [];
    const htmlErrores = analizarHTML(html);
    if (htmlErrores.length === 0) resultados.push('✅ HTML: Estructura bien formada.');
    else resultados.push('❌ HTML: ' + htmlErrores.join('; '));
    const cssErrores = analizarCSS(css);
    if (cssErrores.length === 0) resultados.push('✅ CSS: Reglas bien formadas.');
    else resultados.push('❌ CSS: ' + cssErrores.join('; '));
    const jsErrores = analizarJS(js);
    if (jsErrores.length === 0) resultados.push('✅ JavaScript: Sintaxis correcta.');
    else resultados.push('❌ JavaScript: ' + jsErrores.join('; '));
    document.getElementById('analisisSintaxis').style.display = 'block';
    document.getElementById('resultadoAnalisis').innerText = resultados.join('\n');
    const retroalimentacion = generarRetroalimentacion(html, css, js, htmlErrores, cssErrores, jsErrores);
    document.getElementById('txtObservacionesDocente').value = retroalimentacion;
}

function analizarHTML(codigo) {
    const errores = [];
    const stack = [];
    const sinCerrar = codigo.match(/<([a-zA-Z0-9]+)[^>]*>/g) || [];
    const cerrados = codigo.match(/<\/([a-zA-Z0-9]+)>/g) || [];
    const etiquetasAuto = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    sinCerrar.forEach(tag => {
        const nombre = tag.replace('<','').replace('>','').split(' ')[0].toLowerCase();
        if (!etiquetasAuto.has(nombre) && !tag.endsWith('/>')) stack.push(nombre);
    });
    cerrados.forEach(tag => {
        const nombre = tag.replace('</','').replace('>','').toLowerCase();
        const last = stack[stack.length - 1];
        if (last === nombre) stack.pop();
        else if (stack.includes(nombre)) {
            const idx = stack.lastIndexOf(nombre);
            stack.splice(idx, 1);
        }
    });
    if (stack.length > 0) errores.push(`Etiquetas sin cerrar: ${stack.join(', ')}`);
    if ((codigo.match(/<html/gi) || []).length === 0 && codigo.trim().length > 0) errores.push('Falta etiqueta <html>');
    if ((codigo.match(/<body/gi) || []).length === 0 && codigo.trim().length > 0) errores.push('Falta etiqueta <body>');
    if ((codigo.match(/<head/gi) || []).length === 0 && codigo.trim().length > 0 && codigo.includes('<style')) errores.push('Falta etiqueta <head> si usas <style>');
    return errores;
}

function analizarCSS(codigo) {
    const errores = [];
    const abiertas = (codigo.match(/\{/g) || []).length;
    const cerradas = (codigo.match(/\}/g) || []).length;
    if (abiertas !== cerradas) errores.push(`Llaves desbalanceadas: ${abiertas} abiertas, ${cerradas} cerradas`);
    if (abiertas === 0 && cerradas === 0 && codigo.trim().length > 0) errores.push('No se detectaron reglas CSS con llaves');
    return errores;
}

function analizarJS(codigo) {
    const errores = [];
    try { new Function(codigo); }
    catch (e) { errores.push(e.message); }
    return errores;
}

function generarRetroalimentacion(html, css, js, htmlErrores, cssErrores, jsErrores) {
    const partes = [];
    partes.push('📋 Análisis automático del proyecto:\n');
    partes.push('Estructura HTML:');
    if (htmlErrores.length === 0) partes.push('- Estructura básica correcta.');
    else partes.push('- Errores: ' + htmlErrores.join(', '));
    partes.push('\nSintaxis CSS:');
    if (cssErrores.length === 0) partes.push('- Reglas bien formadas.');
    else partes.push('- Errores: ' + cssErrores.join(', '));
    partes.push('\nSintaxis JavaScript:');
    if (jsErrores.length === 0) partes.push('- Sintaxis correcta.');
    else partes.push('- Errores: ' + jsErrores.join(', '));
    partes.push('\n💡 Observaciones generales:');
    if (!html.trim()) partes.push('- El HTML está vacío.');
    if (!css.trim()) partes.push('- El CSS está vacío.');
    if (!js.trim()) partes.push('- El JS está vacío.');
    if (html.trim() && css.trim() && js.trim() && htmlErrores.length === 0 && cssErrores.length === 0 && jsErrores.length === 0) {
        partes.push('- Muy bien, el código base cumple con la estructura mínima solicitada.');
    }
    return partes.join('\n');
}

function inicializarEventos() {
    document.getElementById('txtClaveMaestra').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') loginDocente();
    });
    document.getElementById('btnLoginDocente').addEventListener('click', loginDocente);
    document.getElementById('filtroCurso').addEventListener('change', cargarAlumnos);
    document.getElementById('btnHtml')?.addEventListener('click', () => cambiarPestaña('HTML'));
    document.getElementById('btnCss')?.addEventListener('click', () => cambiarPestaña('CSS'));
    document.getElementById('btnJs')?.addEventListener('click', () => cambiarPestaña('JS'));
    document.getElementById('btnVista')?.addEventListener('click', () => cambiarPestaña('VISTA'));
    document.querySelector('.btn-revisar')?.addEventListener('click', () => actualizarEstadoEntrega('REVISADO'));
    document.querySelector('.btn-desbloquear')?.addEventListener('click', () => actualizarEstadoEntrega('POR REVISAR'));
    document.getElementById('btnAnalizar')?.addEventListener('click', analizarYGenerarRetroalimentacion);
    document.getElementById('btnGuardarAlumno')?.addEventListener('click', guardarAlumno);
    document.getElementById('btnCancelarEdicion')?.addEventListener('click', cancelarEdicionAlumno);
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

inicializarEventos();
