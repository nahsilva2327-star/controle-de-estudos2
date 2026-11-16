// --- ESTADO GLOBAL DE NAVEGAÇÃO ---
let currentSubject = '';

const subjectsHub = document.getElementById('subjects-hub');
const studyWorkspace = document.getElementById('study-workspace');
const headerSubtitle = document.getElementById('header-subtitle');
const contextBlock = document.getElementById('context-block');
const contextTopic = document.getElementById('context-topic');
const backBtn = document.getElementById('back-btn');

// Função principal que abre o painel ao clicar em um tópico
window.openStudyPanel = function(blockName, subjectName) {
    currentSubject = subjectName;
    activeModuleNumber = null;
    
    contextBlock.textContent = blockName;
    contextTopic.textContent = subjectName;
    headerSubtitle.textContent = `Ambiente focado em ${subjectName}`;

    subjectsHub.classList.add('hidden');
    studyWorkspace.classList.remove('hidden');

    renderSubjectModules();
    updateSubjectStatusButton();
        renderTasks();
    renderPostits();
    renderReferenceMaterial(1);
    renderReferenceMaterial(2);
};

// Volta para a tela dos 3 blocos
backBtn.addEventListener('click', () => {
    studyWorkspace.classList.add('hidden');
    subjectsHub.classList.remove('hidden');
    headerSubtitle.textContent = 'Selecione um tópico abaixo para abrir seu ambiente de estudos';
    
    clearInterval(timerId);
    timerId = null;
});

// --- 1. LÓGICA DO POMODORO ---
let timeLeft = 25 * 60;
let timerId = null;

const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const modeBtns = document.querySelectorAll('.mode-btn');

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

startBtn.addEventListener('click', () => {
    if (timerId !== null) return;
    timerId = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerId);
            timerId = null;
            alert(`Tempo esgotado em ${currentSubject}!`);
        }
    }, 1000);
});

pauseBtn.addEventListener('click', () => {
    clearInterval(timerId);
    timerId = null;
});

resetBtn.addEventListener('click', () => {
    clearInterval(timerId);
    timerId = null;
    const activeMode = document.querySelector('.mode-btn.active');
    timeLeft = parseInt(activeMode.dataset.time) * 60;
    updateTimerDisplay();
});

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!btn.dataset.time) return; // Ignora o botão "Cancelar" do editor
        modeBtns.forEach(b => {
            if (b.dataset.time) b.classList.remove('active');
        });
        btn.classList.add('active');
        clearInterval(timerId);
        timerId = null;
        timeLeft = parseInt(btn.dataset.time) * 60;
        updateTimerDisplay();
    });
});

// --- 2. ASSUNTOS E RESUMO INTEGRADO ---
let tasks = JSON.parse(localStorage.getItem('studyTasksV2')) || [];
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');

function saveTasks() {
    localStorage.setItem('studyTasksV2', JSON.stringify(tasks));
    renderTasks();
}

function renderTasks() {
    taskList.innerHTML = '';

    const filteredTasks = tasks
        .map((task, originalIndex) => ({ ...task, originalIndex }))
        .filter(task => task.subject === currentSubject);

    if (filteredTasks.length === 0) {
        taskList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">Nenhum assunto cadastrado em ${currentSubject} ainda.</p>`;
        return;
    }

    filteredTasks.forEach((task) => {
        const idx = task.originalIndex;
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        const hasSummary = task.summary && task.summary.trim() !== '' ? '📝 ' : '';

        li.innerHTML = `
            <div class="task-header">
                <div onclick="toggleTask(${idx})" style="cursor:pointer; flex:1;">
                    <span class="topic-title">${hasSummary}${task.topic}</span>
                </div>
                <div class="task-actions">
                    <button type="button" class="summary-btn" onclick="toggleSummaryDrawer(${idx})">Resumo</button>
                    <button type="button" class="delete-btn" onclick="deleteTask(${idx})">X</button>
                </div>
            </div>

            <div id="drawer-${idx}" class="summary-drawer hidden">
                <textarea id="textarea-${idx}" rows="4" placeholder="Escreva o resumo sobre ${task.topic}...">${task.summary || ''}</textarea>
                <button type="button" class="save-inline-btn" onclick="saveInlineSummary(${idx})">Salvar Resumo</button>
            </div>
        `;
        taskList.appendChild(li);
    });
}

taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const topic = document.getElementById('topic-input').value;
    tasks.push({ subject: currentSubject, topic, completed: false, summary: '' });
    taskForm.reset();
    saveTasks();
});

window.toggleTask = function(index) {
    tasks[index].completed = !tasks[index].completed;
    saveTasks();
};

window.deleteTask = function(index) {
    tasks.splice(index, 1);
    saveTasks();
};

window.toggleSummaryDrawer = function(index) {
    const drawer = document.getElementById(`drawer-${index}`);
    drawer.classList.toggle('hidden');
    if (!drawer.classList.contains('hidden')) {
        document.getElementById(`textarea-${index}`).focus();
    }
};

window.saveInlineSummary = function(index) {
    const text = document.getElementById(`textarea-${index}`).value;
    tasks[index].summary = text;
    saveTasks();
};

// --- 3. ANOTAÇÕES COMPLEMENTARES (POST-ITS) ---
let postits = JSON.parse(localStorage.getItem('studyPostitsV1')) || [];
const postitForm = document.getElementById('postit-form');
const postitsContainer = document.getElementById('postits-container');

function savePostits() {
    localStorage.setItem('studyPostitsV1', JSON.stringify(postits));
    renderPostits();
}

window.renderPostits = function() {
    if (!postitsContainer) return;
    postitsContainer.innerHTML = '';

    const filteredNotes = postits
        .map((note, originalIndex) => ({ ...note, originalIndex }))
        .filter(note => note.subject === currentSubject);

    if (filteredNotes.length === 0) {
        postitsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; grid-column: 1 / -1;">Nenhum post-it colado em ${currentSubject} ainda.</p>`;
        return;
    }

    filteredNotes.forEach((note) => {
        const idx = note.originalIndex;
        const div = document.createElement('div');
        div.className = 'postit-note';
        div.style.backgroundColor = note.color || '#fef08a';
        
        div.innerHTML = `
            <div>${note.text}</div>
            <button type="button" class="postit-delete" onclick="deletePostit(${idx})">Remover</button>
        `;

        postitsContainer.appendChild(div);
    });
};

if (postitForm) {
    postitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('postit-input').value;
        const selectedColor = document.querySelector('input[name="postit-color"]:checked').value;
        
        postits.push({ subject: currentSubject, text, color: selectedColor });
        postitForm.reset();
        savePostits();
    });
}

window.deletePostit = function(index) {
    postits.splice(index, 1);
    savePostits();
};


// --- 4. MATERIAL DE APOIO COM AUTO-SAVE E MARCA-TEXTO ---
const defaultMaterials = {
    'Direito Penal_1': `O peculato é um crime praticado por funcionário público contra a Administração Pública, previsto nos artigos 312 a 313-B do Código Penal Brasileiro. Ele ocorre quando o agente público usa a facilidade ou a posse garantida pelo seu cargo para se apropriar, desviar ou subtrair dinheiro, valores ou bens móveis (públicos ou particulares) em benefício próprio ou de terceiros.

Características Principais

• Crime próprio. Só pode ser praticado por funcionário público (ou equiparado, conforme o art. 327 do CP), embora um particular possa responder como coautor ou partícipe se souber da condição funcional do agente.
• Objeto material. Abrange dinheiro, valores ou qualquer bem móvel. Não existe peculato de bens imóveis (como um terreno público).
• Bens particulares sob custódia. O bem não precisa pertencer ao Estado; se um carro apreendido em uma blitz (bem particular) for desviado pelo chefe do pátio público, configura-se o peculato.
• Princípio da insignificância. Segundo a Súmula 599 do STJ, não se aplica o princípio da insignificância aos crimes contra a Administração Pública, incluindo o peculato.`,
    'Direito Penal_2': ''
};

// Carrega os dados salvos ou inicia com os padrões
let savedMaterials = JSON.parse(localStorage.getItem('studyMaterialsV2'));
if (!savedMaterials) {
    savedMaterials = defaultMaterials;
    localStorage.setItem('studyMaterialsV2', JSON.stringify(savedMaterials));
}

function getBlockKey(blockId) {
    return `${currentSubject}_${blockId}`;
}

window.renderReferenceMaterial = function(blockId) {
    const refTitle = document.getElementById(`ref-title-${blockId}`);
    const refViewMode = document.getElementById(`ref-view-mode-${blockId}`);
    const refEditMode = document.getElementById(`ref-edit-mode-${blockId}`);
    const refToolbar = document.getElementById(`ref-toolbar-${blockId}`);

    if (!refTitle || !refViewMode) return;

    const baseTitle = blockId === 1 ? '✍️ Resumo:' : '✍️ Resumo:';
    refTitle.textContent = baseTitle;
    
    refEditMode.classList.add('hidden');
    refViewMode.classList.remove('hidden');
    refToolbar.classList.remove('hidden');

    const content = savedMaterials[getBlockKey(blockId)];
    if (content && content.trim() !== '') {
        refViewMode.innerHTML = content;
    } else {
        refViewMode.innerHTML = `<span style="color: var(--text-muted);">Nenhum conteúdo cadastrado neste bloco. Clique em "Editar Texto" para adicionar.</span>`;
    }
};

window.enableRefEdit = function(blockId) {
    const refViewMode = document.getElementById(`ref-view-mode-${blockId}`);
    const refEditMode = document.getElementById(`ref-edit-mode-${blockId}`);
    const refTextarea = document.getElementById(`ref-textarea-${blockId}`);
    const refToolbar = document.getElementById(`ref-toolbar-${blockId}`);

    const currentSaved = savedMaterials[getBlockKey(blockId)] || '';
    
    // Remove tags HTML de grifo apenas na caixa de edição para facilitar a escrita
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentSaved;
    refTextarea.value = tempDiv.innerText;

    refViewMode.classList.add('hidden');
    refToolbar.classList.add('hidden');
    refEditMode.classList.remove('hidden');
    refTextarea.focus();
};

// Salva em tempo real a cada letra digitada no Material de Apoio
window.autoSaveRefEdit = function(blockId) {
    const refTextarea = document.getElementById(`ref-textarea-${blockId}`);
    const statusEl = document.getElementById(`ref-status-${blockId}`);
    
    savedMaterials[getBlockKey(blockId)] = refTextarea.value;
    localStorage.setItem('studyMaterialsV2', JSON.stringify(savedMaterials));
    
    if (statusEl) {
        statusEl.textContent = '✓ Salvo agora';
    }
};

window.saveRefEdit = function(blockId) {
    autoSaveRefEdit(blockId);
    renderReferenceMaterial(blockId);
};

window.highlightSelection = function(blockId, color) {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
        alert('Selecione primeiro um trecho do texto dentro deste bloco para grifar.');
        return;
    }

    const range = selection.getRangeAt(0);
    const refViewMode = document.getElementById(`ref-view-mode-${blockId}`);

    if (!refViewMode.contains(range.commonAncestorContainer)) {
        alert('Selecione o texto dentro do mesmo bloco do botão marca-texto que você clicou.');
        return;
    }

    const mark = document.createElement('mark');
    mark.style.backgroundColor = color;

    try {
        range.surroundContents(mark);
    } catch (e) {
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
    }

    selection.removeAllRanges();

    // Salva imediatamente no localStorage após aplicar o grifo
    savedMaterials[getBlockKey(blockId)] = refViewMode.innerHTML;
    localStorage.setItem('studyMaterialsV2', JSON.stringify(savedMaterials));
};

window.clearHighlights = function(blockId) {
    const refViewMode = document.getElementById(`ref-view-mode-${blockId}`);
    const key = getBlockKey(blockId);
    if (!savedMaterials[key]) return;

    savedMaterials[key] = refViewMode.innerText;
    localStorage.setItem('studyMaterialsV2', JSON.stringify(savedMaterials));
    renderReferenceMaterial(blockId);
};


// --- 5. STATUS DE MATÉRIA ESTUDADA (VERDE) ---
let completedSubjects = JSON.parse(localStorage.getItem('studyCompletedSubjectsV1')) || {};

// Atualiza a cor e o texto do botão dentro do painel
function updateSubjectStatusButton() {
    const btn = document.getElementById('complete-subject-btn');
    if (!btn) return;

    if (completedSubjects[currentSubject]) {
        btn.classList.add('is-done');
        btn.textContent = '✅ Matéria Estudada';
    } else {
        btn.classList.remove('is-done');
        btn.textContent = '⬜ Marcar como Estudada';
    }
}

// Alterna entre estudada (verde) e pendente
window.toggleSubjectCompleted = function() {
    completedSubjects[currentSubject] = !completedSubjects[currentSubject];
    localStorage.setItem('studyCompletedSubjectsV1', JSON.stringify(completedSubjects));
    
    updateSubjectStatusButton();
    paintCompletedCardsOnHub();
};

// Pinta de verde os cartões na tela inicial dos 3 blocos
function paintCompletedCardsOnHub() {
    const topicButtons = document.querySelectorAll('.topic-card-btn');
    
    topicButtons.forEach(btn => {
        const titleEl = btn.querySelector('strong');
        if (!titleEl) return;

        // Pega o nome limpo da matéria (removendo eventual check anterior)
        const rawName = titleEl.dataset.originalName || titleEl.textContent.replace('✅ ', '').trim();
        titleEl.dataset.originalName = rawName;

        if (completedSubjects[rawName]) {
            btn.classList.add('subject-done');
            titleEl.textContent = `✅ ${rawName}`;
        } else {
            btn.classList.remove('subject-done');
            titleEl.textContent = rawName;
        }
    });
}

// Executa ao carregar a página para já mostrar em verde o que foi estudado antes
paintCompletedCardsOnHub();


// --- 6. 10 BOTÕES DE SUB-MATÉRIA + RESUMO ESPECÍFICO ---
let modulesData = JSON.parse(localStorage.getItem('studyModulesV1')) || {};
let activeModuleNumber = null;

function getModuleKey(num) {
    return `${currentSubject}_mod_${num}`;
}

window.renderSubjectModules = function() {
    const grid = document.getElementById('modules-buttons-grid');
    const editorArea = document.getElementById('module-editor-area');
    if (!grid) return;

    grid.innerHTML = '';

    // Se nenhum botão estiver clicado, mantém a caixa de resumo fechada
    if (activeModuleNumber === null) {
        editorArea.classList.add('hidden');
    }

    for (let i = 1; i <= 10; i++) {
        const key = getModuleKey(i);
        const saved = modulesData[key] || { title: '', summary: '' };
        const numFormatted = String(i).padStart(2, '0');
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'module-btn';
        
        if (saved.summary && saved.summary.trim() !== '') {
            btn.classList.add('has-content');
        }
        if (activeModuleNumber === i) {
            btn.classList.add('active-module');
        }

        const displaySubtitle = saved.title && saved.title.trim() !== '' 
            ? saved.title 
            : 'Clique para resumir';

        btn.innerHTML = `
            <strong>Matéria ${numFormatted}</strong>
            <span>${displaySubtitle}</span>
        `;

        btn.onclick = () => openModuleEditor(i);
        grid.appendChild(btn);
    }
};

window.openModuleEditor = function(num) {
    // Se clicar no mesmo botão já aberto, fecha a caixa
    if (activeModuleNumber === num) {
        closeModuleEditor();
        return;
    }

    activeModuleNumber = num;
    const key = getModuleKey(num);
    const saved = modulesData[key] || { title: '', summary: '' };

    document.getElementById('active-module-badge').textContent = `Matéria ${String(num).padStart(2, '0')}`;
    document.getElementById('module-custom-title').value = saved.title || '';
    document.getElementById('module-summary-textarea').value = saved.summary || '';
    document.getElementById('module-save-status').textContent = '✓ Salvo no navegador';

    document.getElementById('module-editor-area').classList.remove('hidden');
    renderSubjectModules();
    document.getElementById('module-summary-textarea').focus();
};

window.closeModuleEditor = function() {
    activeModuleNumber = null;
    document.getElementById('module-editor-area').classList.add('hidden');
    renderSubjectModules();
};

window.autoSaveModuleData = function() {
    if (activeModuleNumber === null) return;

    const key = getModuleKey(activeModuleNumber);
    const titleVal = document.getElementById('module-custom-title').value;
    const summaryVal = document.getElementById('module-summary-textarea').value;

    modulesData[key] = {
        title: titleVal,
        summary: summaryVal
    };

    localStorage.setItem('studyModulesV1', JSON.stringify(modulesData));
    document.getElementById('module-save-status').textContent = '✓ Salvo agora';

    // Atualiza o subtítulo do botão ativo em tempo real
    const activeBtnSpan = document.querySelector('.module-btn.active-module span');
    if (activeBtnSpan) {
        activeBtnSpan.textContent = titleVal.trim() !== '' ? titleVal : 'Clique para resumir';
    }
};

