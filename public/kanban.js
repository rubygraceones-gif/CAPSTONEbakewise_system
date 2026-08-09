function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    setTimeout(() => {
        ev.target.classList.add('dragging');
    }, 0);
}

function drop(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const draggedElement = document.getElementById(data);
    
    if (draggedElement) {
        draggedElement.classList.remove('dragging');

        // Ensure we drop into the column-content, not inside another card
        let dropTarget = ev.target;
        while (dropTarget && !dropTarget.classList.contains('column-content')) {
            dropTarget = dropTarget.parentElement;
        }
        
        if (dropTarget) {
            dropTarget.appendChild(draggedElement);
            updateCounts();
        }
    }
}

// Ensure dragging class is removed if drop is cancelled outside
document.addEventListener('dragend', (ev) => {
    if (ev.target && ev.target.classList) {
        ev.target.classList.remove('dragging');
    }
});

function updateCounts() {
    const columns = document.querySelectorAll('.kanban-column');
    columns.forEach(column => {
        const count = column.querySelectorAll('.kanban-card').length;
        column.querySelector('.task-count').textContent = count;
    });
}
