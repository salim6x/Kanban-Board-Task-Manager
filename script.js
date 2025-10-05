// Utility to generate unique IDs
function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

// Selectors
const board = document.getElementById('board');
const addColumnBtn = document.getElementById('addColumnBtn');
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const modalTitle = document.getElementById('modalTitle');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');

const columnModal = document.getElementById('columnModal');
const columnForm = document.getElementById('columnForm');
const columnModalTitle = document.getElementById('columnModalTitle');
const cancelColumnBtn = document.getElementById('cancelColumnBtn');

const searchInput = document.getElementById('searchInput');

// State
let state = {
  columns: []
};

// Load from localStorage
function loadState() {
  const saved = localStorage.getItem('kanbanState');
  if (saved) {
    state = JSON.parse(saved);
  } else {
    // Initial default columns if none stored
    state = {
      columns: [
        { id: generateId(), title: 'To Do', tasks: [] },
        { id: generateId(), title: 'In Progress', tasks: [] },
        { id: generateId(), title: 'Done', tasks: [] }
      ]
    };
  }
}

// Save to localStorage
function saveState() {
  localStorage.setItem('kanbanState', JSON.stringify(state));
}

// Render entire board
function renderBoard() {
  board.innerHTML = '';
  state.columns.forEach(col => {
    board.appendChild(createColumnElement(col));
  });
  board.appendChild(addColumnBtn);
}

// Create column element
function createColumnElement(column) {
  const colElem = document.createElement('section');
  colElem.className = 'column';
  colElem.dataset.columnId = column.id;
  colElem.setAttribute('aria-label', `${column.title} column`);

  // Column header
  const header = document.createElement('header');
  header.className = 'column-header';

  const colTitle = document.createElement('span');
  colTitle.className = 'column-title';
  colTitle.textContent = column.title;
  colTitle.title = column.title;
  header.appendChild(colTitle);

  // Column edit button
  const colEditBtn = document.createElement('button');
  colEditBtn.type = 'button';
  colEditBtn.title = 'Edit column';
  colEditBtn.textContent = '✎';
  colEditBtn.addEventListener('click', () => openColumnModal(column));
  header.appendChild(colEditBtn);

  // Column delete button
  const colDelBtn = document.createElement('button');
  colDelBtn.type = 'button';
  colDelBtn.title = 'Delete column';
  colDelBtn.textContent = '✕';
  colDelBtn.addEventListener('click', () => deleteColumn(column.id));
  header.appendChild(colDelBtn);

  colElem.appendChild(header);

  // Task list
  const taskList = document.createElement('div');
  taskList.className = 'task-list';
  taskList.dataset.columnId = column.id;
  taskList.addEventListener('dragover', onDragOver);
  taskList.addEventListener('drop', onDrop);

  // Add tasks
  column.tasks.forEach(task => {
    taskList.appendChild(createTaskElement(task, column.id));
  });

  colElem.appendChild(taskList);

  // Add task button
  const addTaskBtn = document.createElement('button');
  addTaskBtn.textContent = '+ Add Task';
  addTaskBtn.className = 'add-task-btn';
  addTaskBtn.type = 'button';
  addTaskBtn.addEventListener('click', () => openTaskModal(null, column.id));
  colElem.appendChild(addTaskBtn);

  return colElem;
}

// Create task element
function createTaskElement(task, columnId) {
  const taskElem = document.createElement('div');
  taskElem.className = 'task';
  taskElem.draggable = true;
  taskElem.dataset.taskId = task.id;
  taskElem.dataset.columnId = columnId;

  taskElem.addEventListener('dragstart', onDragStart);
  taskElem.addEventListener('dragend', onDragEnd);

  // Header
  const taskHeader = document.createElement('div');
  taskHeader.className = 'task-header';

  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = task.title;
  taskHeader.appendChild(title);

  const controls = document.createElement('div');
  controls.className = 'task-controls';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.title = 'Edit task';
  editBtn.textContent = '✎';
  editBtn.addEventListener('click', () => openTaskModal(task, columnId));
  controls.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.title = 'Delete task';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', () => deleteTask(columnId, task.id));
  controls.appendChild(delBtn);

  taskHeader.appendChild(controls);
  taskElem.appendChild(taskHeader);

  // Priority indicator
  const priority = document.createElement('div');
  priority.className = `task-priority priority-${task.priority}`;
  priority.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
  taskElem.appendChild(priority);

  // Due date
  if (task.dueDate) {
    const dueDate = document.createElement('div');
    dueDate.className = 'task-due-date';
    dueDate.textContent = new Date(task.dueDate).toLocaleDateString();
    taskElem.appendChild(dueDate);
  }

  return taskElem;
}

// Drag and drop handlers
let draggedTask = null;

function onDragStart(e) {
  draggedTask = e.target;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedTask.dataset.taskId);
  setTimeout(() => draggedTask.classList.add('dragging'), 0);
}

function onDragEnd(e) {
  if (draggedTask) {
    draggedTask.classList.remove('dragging');
    draggedTask = null;
  }
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

// Drop handler: Move task to the column
function onDrop(e) {
  e.preventDefault();
  if (!draggedTask) return;

  const taskId = draggedTask.dataset.taskId;
  const oldColumnId = draggedTask.dataset.columnId;
  const newColumnId = e.currentTarget.dataset.columnId;

  if (oldColumnId === newColumnId) {
    // Reordering in same column not implemented for simplicity
    return;
  }

  const oldColumn = state.columns.find(c => c.id === oldColumnId);
  const newColumn = state.columns.find(c => c.id === newColumnId);
  if (!oldColumn || !newColumn) return;

  // Remove task from old column
  const taskIndex = oldColumn.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;
  const [task] = oldColumn.tasks.splice(taskIndex, 1);

  // Add task to new column at the end
  newColumn.tasks.push(task);

  saveState();
  renderBoard();
  applySearchFilter();
}

// Add, edit, delete columns
function openColumnModal(column = null) {
  columnModal.classList.remove('hidden');
  if (column) {
    columnModalTitle.textContent = 'Edit Column';
    columnForm.columnTitle.value = column.title;
    columnForm.editColumnId.value = column.id;
  } else {
    columnModalTitle.textContent = 'Add Column';
    columnForm.columnTitle.value = '';
    columnForm.editColumnId.value = '';
  }
}

function closeColumnModal() {
  columnModal.classList.add('hidden');
}

function deleteColumn(columnId) {
  const idx = state.columns.findIndex(c => c.id === columnId);
  if (idx === -1) return;
  if (confirm('Are you sure you want to delete this column and all its tasks?')) {
    state.columns.splice(idx, 1);
    saveState();
    renderBoard();
    applySearchFilter();
  }
}

// Add, edit, delete tasks
function openTaskModal(task = null, columnId = null) {
  taskModal.classList.remove('hidden');
  if (task) {
    modalTitle.textContent = 'Edit Task';
    taskForm.taskTitle.value = task.title;
    taskForm.taskPriority.value = task.priority || 'medium';
    taskForm.taskDueDate.value = task.dueDate || '';
    taskForm.taskId.value = task.id;
    taskForm.columnId.value = columnId;
  } else {
    modalTitle.textContent = 'Add Task';
    taskForm.taskTitle.value = '';
    taskForm.taskPriority.value = 'medium';
    taskForm.taskDueDate.value = '';
    taskForm.taskId.value = '';
    taskForm.columnId.value = columnId;
  }
}

function closeTaskModal() {
  taskModal.classList.add('hidden');
}

function deleteTask(columnId, taskId) {
  const column = state.columns.find(c => c.id === columnId);
  if (!column) return;
  const idx = column.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return;

  if (confirm('Are you sure you want to delete this task?')) {
    column.tasks.splice(idx, 1);
    saveState();
    renderBoard();
    applySearchFilter();
  }
}

// Event listeners for modal buttons and forms
cancelTaskBtn.addEventListener('click', () => closeTaskModal());
cancelColumnBtn.addEventListener('click', () => closeColumnModal());

taskForm.addEventListener('submit', e => {
  e.preventDefault();
  const id = taskForm.taskId.value;
  const columnId = taskForm.columnId.value;
  const title = taskForm.taskTitle.value.trim();
  const priority = taskForm.taskPriority.value;
  const dueDate = taskForm.taskDueDate.value;

  if (!title || !columnId) return;

  const column = state.columns.find(c => c.id === columnId);
  if (!column) return;

  if (id) {
    // Edit task
    const task = column.tasks.find(t => t.id === id);
    if (task) {
      task.title = title;
      task.priority = priority;
      task.dueDate = dueDate;
    }
  } else {
    // Add new task
    column.tasks.push({
      id: generateId(),
      title,
      priority,
      dueDate,
    });
  }

  saveState();
  renderBoard();
  applySearchFilter();
  closeTaskModal();
});

columnForm.addEventListener('submit', e => {
  e.preventDefault();
  const id = columnForm.editColumnId.value;
  const title = columnForm.columnTitle.value.trim();
  if (!title) return;

  if (id) {
    // Edit column
    const column = state.columns.find(c => c.id === id);
    if (column) {
      column.title = title;
    }
  } else {
    // Add new column
    state.columns.push({
      id: generateId(),
      title,
      tasks: []
    });
  }

  saveState();
  renderBoard();
  applySearchFilter();
  closeColumnModal();
});

// Add column button
addColumnBtn.addEventListener('click', () => openColumnModal());

// Search and filter tasks
function applySearchFilter() {
  const searchTerm = searchInput.value.toLowerCase();
  state.columns.forEach(column => {
    const colElem = board.querySelector(`.column[data-column-id="${column.id}"]`);
    if (!colElem) return;
    const tasks = colElem.querySelectorAll('.task');
    tasks.forEach(taskElem => {
      const taskTitle = taskElem.querySelector('.task-title').textContent.toLowerCase();
      if (taskTitle.includes(searchTerm)) {
        taskElem.style.display = '';
      } else {
        taskElem.style.display = 'none';
      }
    });
  });
}

searchInput.addEventListener('input', () => {
  applySearchFilter();
});

// Initialize
loadState();
renderBoard();
applySearchFilter();
