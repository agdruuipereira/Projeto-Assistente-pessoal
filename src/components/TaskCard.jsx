import React from 'react';

export default function TaskCard({ task, onToggleStatus, onDelete }) {
  const isDone = task.status === 'Feito';

  const priorityStyles = {
    Alta: 'bg-error-container/20 text-error border-error/30',
    Média: 'bg-secondary/15 text-secondary border-secondary/30',
    Baixa: 'bg-surface-container-high text-on-surface-variant border-outline-variant/30',
    'Sem prioridade': 'bg-surface-container text-on-surface-variant border-transparent'
  };

  const priorityClass = priorityStyles[task.priority] || priorityStyles['Sem prioridade'];

  return (
    <div
      className={`p-space-md rounded-xl bg-surface-container/70 border border-outline-variant/20 hover:border-outline-variant/50 transition-all flex items-start justify-between gap-space-sm group ${
        isDone ? 'opacity-70 bg-surface-container-low/50' : ''
      }`}
    >
      <div className="flex items-start gap-space-sm flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onToggleStatus(task.id, isDone ? 'Não iniciado' : 'Feito')}
          className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center shrink-0 transition-all ${
            isDone
              ? 'bg-primary text-on-primary shadow-[0_0_8px_rgba(16,185,129,0.3)]'
              : 'border border-outline hover:border-primary bg-surface-container-high'
          }`}
        >
          {isDone && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
        </button>

        <div className="flex flex-col min-w-0">
          <span
            className={`font-body-md text-body-md text-on-surface transition-all ${
              isDone ? 'line-through text-on-surface-variant' : 'font-medium'
            }`}
          >
            {task.title}
          </span>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.category && (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-container-high text-on-surface-variant">
                {task.category}
              </span>
            )}
            {task.priority && task.priority !== 'Sem prioridade' && (
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${priorityClass}`}>
                {task.priority}
              </span>
            )}
            {task.due_date && (
              <span className="font-label-sm text-label-sm text-on-surface-variant/80 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">event</span>
                {task.due_date}
              </span>
            )}
          </div>
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error p-1 rounded transition-all"
          title="Excluir tarefa"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      )}
    </div>
  );
}

