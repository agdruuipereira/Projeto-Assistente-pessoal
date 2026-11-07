import React, { useState, useEffect, useRef } from 'react';
import { UserGoalsService } from '../services/userGoals';
import { playTactileFeedback } from '../services/haptics';

export default function LeituraCinema({ mediaCatalog = [], onCreateMedia, onUpdateMedia, onDeleteMedia, isUltraClean }) {
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'table' | 'segundo-cerebro'
  const [filterType, setFilterType] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('recentes'); // 'recentes' | 'nota' | 'progresso' | 'titulo'
  const [searchQuery, setSearchQuery] = useState('');

  // Metas personalizadas do usuário
  const [booksTarget, setBooksTarget] = useState(() => UserGoalsService.getBooksTarget());
  const [moviesTarget, setMoviesTarget] = useState(() => UserGoalsService.getMoviesTarget());
  const [isEditingGoalModalOpen, setIsEditingGoalModalOpen] = useState(false);
  const [editingGoalType, setEditingGoalType] = useState('books'); // 'books' | 'movies'
  const [customGoalInput, setCustomGoalInput] = useState('');

  // Modal Criar / Editar Obra
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [mediaType, setMediaType] = useState('Livro');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [genre, setGenre] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [totalPages, setTotalPages] = useState(300);
  const [currentPage, setCurrentPage] = useState(0);
  const [status, setStatus] = useState('Em leitura');
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef(null);

  // Drawer / Modal rápido de visualização de Notas & Segundo Cérebro
  const [selectedNotesItem, setSelectedNotesItem] = useState(null);
  const [editingNotesText, setEditingNotesText] = useState('');

  // Sincronizar com atualizações de metas
  useEffect(() => {
    const handleGoalsUpdate = () => {
      setBooksTarget(UserGoalsService.getBooksTarget());
      setMoviesTarget(UserGoalsService.getMoviesTarget());
    };
    window.addEventListener('nexus_user_goals_updated', handleGoalsUpdate);
    return () => window.removeEventListener('nexus_user_goals_updated', handleGoalsUpdate);
  }, []);

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Selecione uma imagem de até 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCoverUrl(String(event.target.result));
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setMediaType('Livro');
    setTitle('');
    setCreator('');
    setGenre('');
    setCoverUrl('');
    setTotalPages(300);
    setCurrentPage(0);
    setStatus('Em leitura');
    setRating(5);
    setNotes('');
    setShowModal(true);
  };

  // Open Edit Modal
  const handleStartEdit = (item) => {
    setEditingItem(item);
    setMediaType(item.media_type || 'Livro');
    setTitle(item.title || '');
    setCreator(item.creator || '');
    setGenre(item.genre || '');
    setCoverUrl(item.cover_url || '');
    setTotalPages(Number(item.total_pages) || 1);
    setCurrentPage(Number(item.current_page) || 0);
    setStatus(item.status || 'Em leitura');
    setRating(Number(item.rating) || 5);
    setNotes(item.notes || '');
    setShowModal(true);
  };

  // Save Media (Create or Update)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      media_type: mediaType,
      title: title.trim(),
      creator: creator.trim(),
      genre: genre.trim(),
      cover_url: coverUrl.trim(),
      total_pages: mediaType === 'Livro' ? Math.max(1, Number(totalPages) || 1) : 1,
      current_page: mediaType === 'Livro' ? Math.max(0, Number(currentPage) || 0) : 0,
      status,
      rating: Number(rating) || 5,
      notes: notes.trim(),
      is_favorite: editingItem ? !!editingItem.is_favorite : false
    };

    if (editingItem) {
      onUpdateMedia(editingItem.id, payload);
    } else {
      onCreateMedia(payload);
    }

    setShowModal(false);
    setEditingItem(null);
    playTactileFeedback('check');
  };

  // Quick Goal Modal
  const handleOpenEditGoal = (type) => {
    setEditingGoalType(type);
    setCustomGoalInput(type === 'books' ? String(booksTarget) : String(moviesTarget));
    setIsEditingGoalModalOpen(true);
    playTactileFeedback('check');
  };

  const handleSaveCustomGoal = (e) => {
    e.preventDefault();
    const val = parseInt(customGoalInput, 10);
    if (isNaN(val) || val <= 0) return;

    if (editingGoalType === 'books') {
      UserGoalsService.setBooksTarget(val);
      setBooksTarget(val);
    } else {
      UserGoalsService.setMoviesTarget(val);
      setMoviesTarget(val);
    }
    setIsEditingGoalModalOpen(false);
    playTactileFeedback('level_up');
  };

  // Quick Book Page Step
  const handleAdjustPages = (item, delta) => {
    const total = Number(item.total_pages) || 1;
    const current = Number(item.current_page) || 0;
    const nextPage = Math.max(0, Math.min(total, current + delta));
    const isCompleted = nextPage >= total;

    onUpdateMedia(item.id, {
      current_page: nextPage,
      status: isCompleted ? 'Lido' : (item.status === 'Quero ler' ? 'Em leitura' : item.status)
    });
    playTactileFeedback('check');
  };

  // Toggle Favorite
  const handleToggleFavorite = (item) => {
    onUpdateMedia(item.id, { is_favorite: !item.is_favorite });
    playTactileFeedback('check');
  };

  // Save quick notes
  const handleSaveNotes = () => {
    if (!selectedNotesItem) return;
    onUpdateMedia(selectedNotesItem.id, { notes: editingNotesText.trim() });
    setSelectedNotesItem(null);
    setEditingNotesText('');
    playTactileFeedback('check');
  };

  // Filter & Sort
  const filteredMedia = mediaCatalog.filter((item) => {
    const matchesType = filterType === 'Todos' || item.media_type === filterType;
    if (!matchesType) return false;

    let matchesStatus = true;
    if (statusFilter === 'andamento') matchesStatus = item.status === 'Em leitura' || item.status === 'Em andamento';
    if (statusFilter === 'concluido') matchesStatus = item.status === 'Lido' || item.status === 'Assistido';
    if (statusFilter === 'desejo') matchesStatus = item.status === 'Quero ler' || item.status === 'Quero ver';
    if (statusFilter === 'favoritos') matchesStatus = !!item.is_favorite;

    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.creator && item.creator.toLowerCase().includes(q)) ||
      (item.genre && item.genre.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );
  }).sort((a, b) => {
    if (sortBy === 'nota') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    if (sortBy === 'titulo') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'progresso') {
      const pctA = a.total_pages ? ((a.current_page || 0) / a.total_pages) : 0;
      const pctB = b.total_pages ? ((b.current_page || 0) / b.total_pages) : 0;
      return pctB - pctA;
    }
    return 0; // recentes / padrão
  });

  // Telemetry Aggregations
  const totalBooksRead = mediaCatalog.filter((m) => m.media_type === 'Livro' && (m.status === 'Lido' || Number(m.current_page) >= Number(m.total_pages))).length;
  const totalPagesRead = mediaCatalog
    .filter((m) => m.media_type === 'Livro')
    .reduce((acc, m) => acc + (Number(m.current_page) || 0), 0);
  const totalMovies = mediaCatalog.filter((m) => (m.media_type === 'Filme' || m.media_type === 'Documentário' || m.media_type === 'Série') && m.status === 'Assistido').length;

  const ratedItems = mediaCatalog.filter((m) => Number(m.rating) > 0);
  const avgRating = ratedItems.length > 0
    ? (ratedItems.reduce((acc, m) => acc + Number(m.rating), 0) / ratedItems.length).toFixed(1)
    : '5.0';

  const booksPercentage = booksTarget > 0 ? Math.min(100, Math.round((totalBooksRead / booksTarget) * 100)) : 0;
  const moviesPercentage = moviesTarget > 0 ? Math.min(100, Math.round((totalMovies / moviesTarget) * 100)) : 0;

  const itemsWithNotes = mediaCatalog.filter((m) => m.notes && m.notes.trim().length > 0);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'Livro': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Filme': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Série': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Documentário': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-700/30 text-slate-300 border-slate-600/40';
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'Lido':
      case 'Assistido':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
      case 'Em leitura':
      case 'Em andamento':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-slate-700/40 text-[#94A3B8] border-slate-600/40';
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#111827] to-[#0A0E17] border border-[#1F293D] p-6 rounded-2xl shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 text-xs font-mono font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Segundo Cérebro & Acervo Intelectual
              </span>
              <span className="text-xs text-[#64748B]">• Curadoria de Alto Impacto</span>
              {isUltraClean && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  ✨ Modo Essencial
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Leitura & Cinema
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Gestão de repertório cultural, obras literárias transformadoras, cinema de profundidade e destilação de insights práticos para o Projeto 2027.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#022129] font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
              <span>+ Adicionar Obra</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stats com Metas Personalizáveis */}
        {!isUltraClean && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-[#1F293D]/70">
            {/* Livros Lidos */}
            <div className="bg-[#111827]/80 border border-[#1F293D] hover:border-emerald-500/40 p-4 rounded-xl flex flex-col justify-between transition-colors group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Livros Lidos</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditGoal('books')}
                      className="opacity-60 group-hover:opacity-100 hover:text-emerald-400 text-[10px] flex items-center gap-0.5 text-cyan-400 transition-opacity"
                      title="Editar meta de livros"
                    >
                      <span className="material-symbols-outlined text-[12px]">edit</span>
                      <span>Meta</span>
                    </button>
                  </div>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">
                    {totalBooksRead} <span className="text-xs text-[#64748B] font-normal">/ {booksTarget}</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-[20px]">menu_book</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${booksPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mt-1 font-mono">
                  <span>Alvo 2027: {booksTarget}</span>
                  <span className="text-emerald-400 font-bold">{booksPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Páginas Lidas */}
            <div className="bg-[#111827]/80 border border-[#1F293D] p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Páginas Lidas</span>
                <div className="text-xl font-bold text-cyan-400 mt-0.5 font-mono">{totalPagesRead} págs</div>
                <span className="text-[10px] text-[#94A3B8]">Volume acumulado</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-[20px]">auto_stories</span>
              </div>
            </div>

            {/* Filmes & Séries */}
            <div className="bg-[#111827]/80 border border-[#1F293D] hover:border-purple-500/40 p-4 rounded-xl flex flex-col justify-between transition-colors group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Filmes / Séries</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditGoal('movies')}
                      className="opacity-60 group-hover:opacity-100 hover:text-purple-400 text-[10px] flex items-center gap-0.5 text-purple-400 transition-opacity"
                      title="Editar meta de filmes"
                    >
                      <span className="material-symbols-outlined text-[12px]">edit</span>
                      <span>Meta</span>
                    </button>
                  </div>
                  <div className="text-xl font-bold text-purple-400 mt-0.5 font-mono">
                    {totalMovies} <span className="text-xs text-[#64748B] font-normal">/ {moviesTarget}</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                  <span className="material-symbols-outlined text-[20px]">movie</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${moviesPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mt-1 font-mono">
                  <span>Alvo 2027: {moviesTarget}</span>
                  <span className="text-purple-400 font-bold">{moviesPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Avaliação Média */}
            <div className="bg-[#111827]/80 border border-[#1F293D] p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Avaliação Média</span>
                <div className="text-xl font-bold text-amber-400 mt-0.5 font-mono flex items-center gap-1">
                  {avgRating} <span className="text-sm">★</span>
                </div>
                <span className="text-[10px] text-[#94A3B8]">{ratedItems.length} obras avaliadas</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <span className="material-symbols-outlined text-[20px]">hotel_class</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Switcher Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
        <div className="flex items-center gap-1.5 bg-[#111827] border border-[#1F293D] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'grid'
                ? 'bg-cyan-500 text-[#022129] shadow-sm font-bold'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            <span>Estante Virtual</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'table'
                ? 'bg-cyan-500 text-[#022129] shadow-sm font-bold'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">view_list</span>
            <span>Lista Compacta</span>
          </button>

          <button
            onClick={() => setActiveTab('segundo-cerebro')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'segundo-cerebro'
                ? 'bg-cyan-500 text-[#022129] shadow-sm font-bold'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            <span>Segundo Cérebro ({itemsWithNotes.length})</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#64748B] text-[16px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, autor, gênero..."
            className="w-full bg-[#111827] border border-[#1F293D] rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-[#64748B] hover:text-white"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Sorting Bar */}
      {activeTab !== 'segundo-cerebro' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#111827]/80 border border-[#1F293D] p-3 rounded-xl text-xs">
          {/* Media Type Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#64748B] font-semibold mr-1">Tipo:</span>
            {['Todos', 'Livro', 'Filme', 'Série', 'Documentário'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  filterType === type
                    ? 'bg-cyan-500 text-[#022129] font-bold shadow-sm'
                    : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#64748B] font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#1E293B] border border-[#334155] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-500"
              >
                <option value="Todos">Todos os Status</option>
                <option value="andamento">Em Leitura / Andamento</option>
                <option value="concluido">Concluídos (Lido/Visto)</option>
                <option value="desejo">Lista de Desejos (Quero ver/ler)</option>
                <option value="favoritos">Favoritos ❤️</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#64748B] font-semibold">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#1E293B] border border-[#334155] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-500"
              >
                <option value="recentes">Mais recentes</option>
                <option value="nota">Maior Nota ★</option>
                <option value="progresso">Progresso (%)</option>
                <option value="titulo">Título (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: ESTANTE VIRTUAL (GRID) */}
      {activeTab === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredMedia.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-[#111827] border border-[#1F293D] rounded-2xl p-6">
              <span className="material-symbols-outlined text-[42px] text-[#64748B] mb-2">library_books</span>
              <p className="text-sm font-semibold text-white">Nenhuma obra encontrada no acervo.</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                {searchQuery ? 'Tente outros filtros ou termos de busca.' : 'Clique no botão acima para adicionar sua primeira leitura ou filme!'}
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-[#022129] text-xs font-bold hover:bg-cyan-400 transition-colors"
              >
                + Adicionar Obra
              </button>
            </div>
          ) : (
            filteredMedia.map((item) => {
              const isBook = item.media_type === 'Livro';
              const isDone = item.status === 'Lido' || item.status === 'Assistido' || (isBook && Number(item.current_page) >= Number(item.total_pages));
              const pct = isBook && Number(item.total_pages) > 0
                ? Math.min(100, Math.round((Number(item.current_page || 0) / Number(item.total_pages)) * 100))
                : (isDone ? 100 : 0);

              return (
                <div
                  key={item.id}
                  className={`bg-[#111827] border rounded-2xl flex flex-col justify-between transition-all group shadow-sm hover:shadow-md ${
                    isDone
                      ? 'border-emerald-500/30 bg-gradient-to-b from-[#111827] to-[#041F15]/20'
                      : 'border-[#1F293D] hover:border-[#334155]'
                  }`}
                >
                  <div className="p-4">
                    {/* Top Type Pill & Actions */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getTypeBadge(item.media_type)}`}>
                        {item.media_type}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(item)}
                          className="p-1 text-[#64748B] hover:text-red-400 transition-colors"
                          title={item.is_favorite ? 'Remover dos favoritos' : 'Favoritar'}
                        >
                          <span className={`material-symbols-outlined text-[16px] ${item.is_favorite ? 'text-red-400' : ''}`}>
                            {item.is_favorite ? 'favorite' : 'favorite_border'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#94A3B8] hover:text-cyan-400 transition-all rounded hover:bg-[#1E293B]"
                          title="Editar obra"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja remover "${item.title}" do acervo?`)) {
                              onDeleteMedia(item.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#94A3B8] hover:text-red-400 transition-all rounded hover:bg-[#1E293B]"
                          title="Excluir obra"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Cover Image or Fallback */}
                    <div className="w-full h-44 rounded-xl overflow-hidden mb-3 relative bg-[#1E293B] border border-[#1F293D] flex items-center justify-center">
                      {item.cover_url ? (
                        <img
                          src={item.cover_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#64748B] p-4 text-center">
                          <span className="material-symbols-outlined text-[36px] mb-1">
                            {isBook ? 'menu_book' : 'movie'}
                          </span>
                          <span className="text-[10px] uppercase font-mono tracking-wider">Sem Capa</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent opacity-60" />

                      {/* Status Overlay */}
                      <div className="absolute bottom-2 left-2">
                        <select
                          value={item.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            const isMarkingDone = newStatus === 'Lido' || newStatus === 'Assistido';
                            onUpdateMedia(item.id, {
                              status: newStatus,
                              ...(isMarkingDone && isBook ? { current_page: item.total_pages } : {})
                            });
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border outline-none cursor-pointer backdrop-blur-md ${getStatusBadge(item.status)}`}
                        >
                          {isBook ? (
                            <>
                              <option value="Em leitura">Em leitura</option>
                              <option value="Lido">Lido ✔</option>
                              <option value="Quero ler">Quero ler</option>
                            </>
                          ) : (
                            <>
                              <option value="Em andamento">Em andamento</option>
                              <option value="Assistido">Assistido ✔</option>
                              <option value="Quero ver">Quero ver</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Title & Creator */}
                    <h3 className={`text-sm font-bold leading-snug line-clamp-1 ${isDone ? 'text-emerald-300' : 'text-white'}`}>
                      {item.title}
                    </h3>
                    <div className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">
                      {item.creator ? `Por ${item.creator}` : 'Autor não informado'}
                      {item.genre && ` • ${item.genre}`}
                    </div>
                  </div>

                  {/* Reading Progress & Bottom Section */}
                  <div className="p-4 pt-2 border-t border-[#1F293D]/60 space-y-2.5">
                    {isBook && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#94A3B8]">Páginas</span>
                          <span className="font-bold text-white">
                            {pct}% ({item.current_page || 0}/{item.total_pages || 1})
                          </span>
                        </div>

                        <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Page Steppers */}
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAdjustPages(item, -10)}
                              className="px-1.5 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] text-[9px] font-mono transition-colors"
                              title="Voltar 10 páginas"
                            >
                              -10
                            </button>
                            <button
                              onClick={() => handleAdjustPages(item, 10)}
                              className="px-1.5 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] text-cyan-400 text-[9px] font-mono transition-colors"
                              title="Avançar 10 páginas"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => handleAdjustPages(item, 25)}
                              className="px-1.5 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] text-emerald-400 text-[9px] font-mono transition-colors"
                              title="Avançar 25 páginas"
                            >
                              +25
                            </button>
                          </div>

                          {!isDone && (
                            <button
                              onClick={() => onUpdateMedia(item.id, { current_page: item.total_pages, status: 'Lido' })}
                              className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 transition-colors"
                            >
                              Concluir
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Star Rating & Notes Button */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => onUpdateMedia(item.id, { rating: star })}
                            className={`text-[15px] transition-colors cursor-pointer ${
                              star <= (Number(item.rating) || 0) ? 'text-amber-400' : 'text-[#334155]'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNotesItem(item);
                          setEditingNotesText(item.notes || '');
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-colors ${
                          item.notes && item.notes.trim()
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            : 'bg-[#1E293B] text-[#94A3B8] border-transparent hover:text-white'
                        }`}
                        title="Ver ou escrever notas e insights"
                      >
                        <span className="material-symbols-outlined text-[12px]">edit_note</span>
                        <span>{item.notes ? 'Ver Notas' : '+ Nota'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: LISTA COMPACTA (TABELA) */}
      {activeTab === 'table' && (
        <div className="bg-[#111827] border border-[#1F293D] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0C121E] text-[#94A3B8] uppercase text-[10px] font-semibold tracking-wider border-b border-[#1F293D]">
                <tr>
                  <th className="py-3 px-4">Obra / Título</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Autor / Diretor</th>
                  <th className="py-3 px-4">Gênero</th>
                  <th className="py-3 px-4">Progresso / Páginas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Avaliação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F293D]/60 text-slate-200">
                {filteredMedia.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#64748B]">
                      Nenhuma obra encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredMedia.map((item) => {
                    const isBook = item.media_type === 'Livro';
                    const isDone = item.status === 'Lido' || item.status === 'Assistido';
                    const pct = isBook && Number(item.total_pages) > 0
                      ? Math.min(100, Math.round((Number(item.current_page || 0) / Number(item.total_pages)) * 100))
                      : (isDone ? 100 : 0);

                    return (
                      <tr key={item.id} className="hover:bg-[#1E293B]/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {item.cover_url ? (
                              <img src={item.cover_url} alt="" className="w-8 h-10 object-cover rounded bg-[#1E293B] shrink-0" />
                            ) : (
                              <div className="w-8 h-10 rounded bg-[#1E293B] flex items-center justify-center text-[#64748B] shrink-0">
                                <span className="material-symbols-outlined text-[16px]">{isBook ? 'menu_book' : 'movie'}</span>
                              </div>
                            )}
                            <div>
                              <span className={`font-bold block ${isDone ? 'text-emerald-300' : 'text-white'}`}>{item.title}</span>
                              {item.is_favorite && <span className="text-[10px] text-red-400">★ Favorito</span>}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getTypeBadge(item.media_type)}`}>
                            {item.media_type}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-[#94A3B8]">{item.creator || '—'}</td>
                        <td className="py-3 px-4 text-[#94A3B8]">{item.genre || '—'}</td>

                        <td className="py-3 px-4 font-mono">
                          {isBook ? (
                            <div className="space-y-1 w-32">
                              <div className="flex justify-between text-[10px] text-[#94A3B8]">
                                <span>{pct}%</span>
                                <span>{item.current_page || 0}/{item.total_pages}</span>
                              </div>
                              <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                                <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#64748B]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-amber-400 font-bold">
                          {item.rating ? `${item.rating} ★` : '—'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedNotesItem(item);
                                setEditingNotesText(item.notes || '');
                              }}
                              className="p-1 text-[#94A3B8] hover:text-cyan-400"
                              title="Notas da obra"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit_note</span>
                            </button>
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1 text-[#94A3B8] hover:text-white"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => onDeleteMedia(item.id)}
                              className="p-1 text-[#94A3B8] hover:text-red-400"
                              title="Excluir"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SEGUNDO CÉREBRO (RESUMOS & INSIGHTS) */}
      {activeTab === 'segundo-cerebro' && (
        <div className="space-y-6">
          <div className="bg-[#111827] border border-[#1F293D] p-5 rounded-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400">psychology</span>
              Segundo Cérebro: Conhecimento Destilado
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Coleção de notas, citações de alto impacto e aplicações práticas extraídas dos livros e produções audiovisuais do seu acervo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {itemsWithNotes.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-[#111827] border border-[#1F293D] rounded-2xl p-6">
                <span className="material-symbols-outlined text-[42px] text-[#64748B] mb-2">note_alt</span>
                <p className="text-sm font-semibold text-white">Nenhum insight ou resumo registrado ainda.</p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Abra qualquer obra na Estante Virtual e clique em "+ Nota" para registrar lições aprendidas e citações!
                </p>
              </div>
            ) : (
              itemsWithNotes.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#111827] border border-[#1F293D] hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-3 transition-all shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getTypeBadge(item.media_type)}`}>
                        {item.media_type}
                      </span>
                      <span className="text-[11px] font-mono text-amber-400 font-bold">{item.rating} ★</span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{item.title}</h3>
                    <span className="text-[11px] text-[#64748B] block">{item.creator ? `Por ${item.creator}` : ''}</span>

                    <div className="mt-3 p-3 rounded-xl bg-[#0C121E] border border-[#1F293D] text-xs text-slate-300 leading-relaxed whitespace-pre-line italic">
                      "{item.notes}"
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1F293D] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-[#64748B] font-mono">Status: {item.status}</span>
                    <button
                      onClick={() => {
                        setSelectedNotesItem(item);
                        setEditingNotesText(item.notes || '');
                      }}
                      className="text-cyan-400 hover:text-white font-semibold text-[11px] flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      <span>Editar Insight</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal / Drawer de Notas Rápidas do Segundo Cérebro */}
      {selectedNotesItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-[#1F293D] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">psychology</span>
                Notas & Insights: {selectedNotesItem.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedNotesItem(null)}
                className="text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-[#94A3B8] block">
                Registre os conceitos centrais, melhores citações e como aplicar o aprendizado desta obra:
              </label>
              <textarea
                rows="6"
                value={editingNotesText}
                onChange={(e) => setEditingNotesText(e.target.value)}
                placeholder="Ex: 'O antifrágil cresce com a volatilidade e o estresse.' Aplicar ajustando os treinos e diversificando as fontes de receita..."
                className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-3 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-500 leading-relaxed"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setSelectedNotesItem(null)}
                className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-[#022129] font-bold text-xs hover:bg-cyan-400 transition-colors shadow-sm"
              >
                Salvar Insights
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Personalizar Meta de Obras */}
      {isEditingGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111827] border border-[#1F293D] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">edit</span>
                {editingGoalType === 'books' ? 'Definir Meta de Livros' : 'Definir Meta de Filmes'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingGoalModalOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCustomGoal} className="space-y-4">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1.5">
                  {editingGoalType === 'books'
                    ? 'Quantos livros você deseja ler no seu projeto até 2027?'
                    : 'Quantos filmes/documentários você deseja assistir?'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={customGoalInput}
                  onChange={(e) => setCustomGoalInput(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-3 text-lg font-mono font-bold text-white outline-none focus:border-cyan-500"
                  autoFocus
                />
                <p className="text-[11px] text-[#64748B] mt-1.5">
                  As barras de progresso e estatísticas de telemetria serão recalculadas automaticamente.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => setIsEditingGoalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-[#022129] text-xs font-bold hover:bg-cyan-400 transition-all shadow-md"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar / Editar Obra */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-[#1F293D] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">
                  {editingItem ? 'edit' : 'bookmark_add'}
                </span>
                {editingItem ? 'Editar Obra do Acervo' : 'Cadastrar Obra no Acervo'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Tipo de Obra</label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="Livro">Livro</option>
                    <option value="Filme">Filme</option>
                    <option value="Série">Série</option>
                    <option value="Documentário">Documentário</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="Em leitura">Em leitura / Em andamento</option>
                    <option value="Quero ler">Quero ler / Ver</option>
                    <option value="Lido">Lido / Assistido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Título da Obra</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Antifrágil, O Poder do Hábito, Oppenheimer..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Autor / Diretor</label>
                  <input
                    type="text"
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                    placeholder="Ex: Nassim Taleb, Christopher Nolan..."
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Gênero / Categoria</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Ex: Filosofia, Finanças, Ficção..."
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {mediaType === 'Livro' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Total de Páginas</label>
                    <input
                      type="number"
                      min="1"
                      value={totalPages}
                      onChange={(e) => setTotalPages(e.target.value)}
                      className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Página Atual</label>
                    <input
                      type="number"
                      min="0"
                      value={currentPage}
                      onChange={(e) => setCurrentPage(e.target.value)}
                      className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Avaliação em Estrelas */}
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Avaliação (1 a 5 Estrelas)</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-xl transition-colors cursor-pointer ${
                          star <= rating ? 'text-amber-400' : 'text-[#334155]'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-mono text-[#94A3B8]">({rating} de 5)</span>
                </div>
              </div>

              {/* Notas & Insights */}
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                  Notas & Insights (Segundo Cérebro)
                </label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Resumo, melhores lições, citações de destaque..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Upload de Capa */}
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Capa da Obra (opcional)</label>
                <div className="flex items-center gap-3">
                  {coverUrl && (
                    <div className="w-14 h-16 rounded-lg overflow-hidden bg-[#1E293B] border border-[#334155] shrink-0">
                      <img src={coverUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-cyan-400 text-xs font-semibold flex items-center gap-1 border border-[#334155] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                        <span>Escolher Arquivo</span>
                      </button>
                      {coverUrl && (
                        <button
                          type="button"
                          onClick={() => setCoverUrl('')}
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs hover:bg-red-500/25 transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={coverUrl.startsWith('data:') ? '' : coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="Ou cole o link direto da imagem (URL)..."
                      className="w-full bg-[#1E293B] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-[#022129] font-bold text-xs hover:bg-cyan-400 transition-all shadow-md"
                >
                  {editingItem ? 'Salvar Alterações' : 'Salvar Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
