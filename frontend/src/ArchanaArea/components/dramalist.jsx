import React, { useState, useRef, useEffect } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
const API_BASE = import.meta.env.VITE_API_URL;

const C = {
  bg:      '#f6f5f0',
  white:   '#ffffff',
  dark:    '#1a1a2e',
  green:   '#2d6a4f',
  greenLt: '#d8f3dc',
  border:  '#d8d4cc',
  muted:   '#eceae3',
  soft:    '#7a7567',
  red:     '#e74c3c',
  redLt:   '#fdecea',
  gold:    '#d4af37',
  goldLt:  '#fdf6dc',
};


const BASE_URL = `${API_BASE}/api`;

const EMPTY_FORM = {
  type: 'drama', title: '', genre: '', rating: '', status: 'Plan to Watch',
  emoji: '🎬', note: '', year: '', episodes: '',
};

const TYPE_TABS  = ['All', 'drama', 'movie', 'anime'];
const STATUS_OPT = ['Watching', 'Finished', 'Plan to Watch', 'On Hold', 'Dropped'];
const TYPE_OPT   = ['drama', 'movie', 'anime'];
const GENRE_OPT  = [
  'Slice of Life', 'Romance', 'Thriller', 'Action', 'Drama', 'Fantasy', 'Historical',
  'Crime/Dark Comedy', 'Romance/Fantasy', 'Horror/Action', 'Action/Superhero',
  'Action/Dark', 'Romance/Music', 'Drama/Fantasy', 'Adventure/Fantasy', 'Sci-Fi', 'Comedy',
];
const EMOJI_OPT = ['🎬','🎥','📺','🎭','💛','🌧','🌹','📻','🕯','🎸','🪂','🌻','🌊','⚡','🏠','🚂','🌅','💌','🐉','🎹','⚔️','🌸','🔥','💫','🎃','👁','🌙','🌟'];

const STATUS_COLOR = {
  'Watching':      { bg:'#d8f3dc', color:'#2d6a4f', border:'#b7e4c7' },
  'Finished':      { bg:C.muted,   color:C.soft,    border:C.border  },
  'Plan to Watch': { bg:'#e8f4fd', color:'#1a6fa8', border:'#b3d9f5' },
  'On Hold':       { bg:'#fdf6dc', color:'#9a7a00', border:'#f0d96a' },
  'Dropped':       { bg:'#fdecea', color:C.red,     border:'#f5b7b1' },
};

const TYPE_COLOR = {
  drama: { bg:'#ede7f6', color:'#5e35b1', border:'#c5b4e8' },
  movie: { bg:'#fce4ec', color:'#c2185b', border:'#f48fb1' },
  anime: { bg:'#e3f2fd', color:'#1565c0', border:'#90caf9' },
};


const fadeUp   = keyframes`from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}`;
const overlayIn= keyframes`from{opacity:0;}to{opacity:1;}`;
const modalIn  = keyframes`from{opacity:0;transform:translateY(20px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}`;
const pulse    = keyframes`0%,100%{opacity:1;}50%{opacity:.6;}`;
const shake    = keyframes`0%,100%{transform:translateX(0);}25%{transform:translateX(-6px);}75%{transform:translateX(6px);}`;
const spin     = keyframes`to{transform:rotate(360deg);}`;


const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};color:${C.dark};font-family:'DM Sans',system-ui,sans-serif;line-height:1.65;overflow-x:hidden;}
  ::-webkit-scrollbar{width:8px;}
  ::-webkit-scrollbar-track{background:${C.bg};}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:8px;}
  ::-webkit-scrollbar-thumb:hover{background:${C.green};}
`;


export default function Drama({ onBack }) {
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [savingId,  setSavingId]  = useState(null);   
  const [apiError,  setApiError]  = useState('');

  const [tab,       setTab]       = useState('All');
  const [search,    setSearch]    = useState('');
  const [sort,      setSort]      = useState('default');

  const [modal,     setModal]     = useState(null);   
  const [editItem,  setEditItem]  = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  const [form,      setForm]      = useState(EMPTY_FORM);
  const [errors,    setErrors]    = useState({});
  const [toast,     setToast]     = useState(null);
  const toastRef = useRef(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch(`${BASE_URL}/watchlist/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.log(err)
      setApiError('Failed to load watchlist. Check your connection.');
    } finally {
      setLoading(false);
    }
  };


  const showToast = (msg, icon = '✓') => {
    setToast({ msg, icon });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2600);
  };


  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditItem(null);
    setModal('add');
  };


  const openEdit = (item) => {
    setForm({
      type:     item.type     || 'drama',
      title:    item.title    || '',
      genre:    item.genre    || '',
      rating:   item.rating   != null ? String(item.rating) : '',
      status:   item.status   || 'Plan to Watch',
      emoji:    item.emoji    || '🎬',
      note:     item.note     || '',
      year:     item.year     != null ? String(item.year)   : '',
      episodes: item.episodes != null ? String(item.episodes) : '',
    });
    setErrors({});
    setEditItem(item);
    setModal('edit');
  };

 
  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title  = true;
    if (!form.genre.trim()) e.genre  = true;
    if (!form.rating)       e.rating = true;
    return e;
  };

  const buildPayload = () => ({
    type:     form.type,
    title:    form.title.trim(),
    genre:    form.genre.trim(),
    rating:   Number(form.rating),
    status:   form.status,
    emoji:    form.emoji || '🎬',
    note:     form.note  || '',
    year:     form.year     ? Number(form.year)     : null,
    episodes: form.episodes ? Number(form.episodes) : null,
  });

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const isEdit  = modal === 'edit';
    const url     = isEdit ? `${BASE_URL}/watchlist/${editItem.id}/` : `${BASE_URL}/watchlist/`;
    const method  = isEdit ? 'PUT' : 'POST';

    setSavingId(isEdit ? editItem.id : 'new');
    setApiError('');

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload()),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(Object.values(errData).flat().join(' — '));
      }

      const saved = await res.json();

      if (isEdit) {
        setItems(prev => prev.map(x => x.id === editItem.id ? saved : x));
        showToast(`"${saved.title}" updated!`);
      } else {
        setItems(prev => [saved, ...prev]);
        showToast(`"${saved.title}" added!`);
      }
      setModal(null);
    } catch (err) {
      setApiError(err.message || 'Save failed.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setSavingId(delTarget.id);
    setApiError('');
    try {
      const res = await fetch(`${BASE_URL}/watchlist/${delTarget.id}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed.');
      setItems(prev => prev.filter(x => x.id !== delTarget.id));
      showToast(`"${delTarget.title}" removed.`, '🗑');
      setDelTarget(null);
    } catch (err) {
      setApiError(err.message || 'Could not delete item.');
    } finally {
      setSavingId(null);
    }
  };

  const visible = items
    .filter(x => tab === 'All' || x.type === tab)
    .filter(x => {
      const q = search.toLowerCase();
      return x.title.toLowerCase().includes(q) ||
             x.genre.toLowerCase().includes(q)  ||
             (x.note || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === 'rating-desc') return Number(b.rating) - Number(a.rating);
      if (sort === 'rating-asc')  return Number(a.rating) - Number(b.rating);
      if (sort === 'title-az')    return a.title.localeCompare(b.title);
      if (sort === 'title-za')    return b.title.localeCompare(a.title);
      if (sort === 'year-desc')   return Number(b.year || 0) - Number(a.year || 0);
      return 0;
    });

  const counts = {
    total:    items.length,
    watching: items.filter(x => x.status === 'Watching').length,
    finished: items.filter(x => x.status === 'Finished').length,
    planned:  items.filter(x => x.status === 'Plan to Watch').length,
    drama:    items.filter(x => x.type   === 'drama').length,
    movie:    items.filter(x => x.type   === 'movie').length,
    anime:    items.filter(x => x.type   === 'anime').length,
  };

  const isSavingNew = savingId === 'new';
  const closeModal  = () => setModal(null);


  return (
    <>
      <GlobalStyle />
      <PageWrap>

        <TopBar>
          <TBLeft>
            <GreenDot />
            <NavBrand>My <em>Watchlist</em></NavBrand>
          </TBLeft>
          <TBRight>
            <PillBtn $primary onClick={openAdd}>+ Add Entry</PillBtn>
            {onBack && <PillBtn onClick={onBack}>← Back</PillBtn>}
          </TBRight>
        </TopBar>

        <Main>
          <PageHeader>
            <PageChip><span />Personal Collection</PageChip>
            <PageTitle>Dramas, <em>Movies</em> & Anime</PageTitle>
            <PageDesc>Every title that has made me feel something. Ratings are final. No debate.</PageDesc>
          </PageHeader>

          {apiError && (
            <ErrorBanner>
              {apiError}
              <DismissX onClick={() => setApiError('')}>✕</DismissX>
            </ErrorBanner>
          )}

          {!loading && (
            <StatsStrip>
              {[
                { n: counts.total,    l: 'Total',    e: '📋' },
                { n: counts.watching, l: 'Watching', e: '▶️' },
                { n: counts.finished, l: 'Finished', e: '✅' },
                { n: counts.planned,  l: 'Planned',  e: '📌' },
                { n: counts.drama,    l: 'Dramas',   e: '🎭' },
                { n: counts.movie,    l: 'Movies',   e: '🎬' },
                { n: counts.anime,    l: 'Anime',    e: '✨' },
              ].map((s, i) => (
                <StatPill key={i}>
                  <span style={{ fontSize: '1rem' }}>{s.e}</span>
                  <StatNum>{s.n}</StatNum>
                  <StatLbl>{s.l}</StatLbl>
                </StatPill>
              ))}
            </StatsStrip>
          )}

          <ControlsRow>
            <SearchBox>
              <span>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search title, genre, note..."
              />
            </SearchBox>
            <FilterTabs>
              {TYPE_TABS.map(t => (
                <FilterTab key={t} $active={tab === t} onClick={() => setTab(t)}>{t}</FilterTab>
              ))}
            </FilterTabs>
            <SortSelect value={sort} onChange={e => setSort(e.target.value)}>
              <option value="default">Sort: Default</option>
              <option value="rating-desc">Rating: High → Low</option>
              <option value="rating-asc">Rating: Low → High</option>
              <option value="title-az">Title: A → Z</option>
              <option value="title-za">Title: Z → A</option>
              <option value="year-desc">Year: Newest</option>
            </SortSelect>
          </ControlsRow>

          {loading && (
            <LoadingState>
              <LoadSpinner />
              Loading watchlist...
            </LoadingState>
          )}

          {!loading && (
            <Grid>
              {visible.length === 0 ? (
                <EmptyState>
                  <EmptyIcon>🎭</EmptyIcon>
                  <EmptyTitle>Nothing here yet</EmptyTitle>
                  <EmptyDesc>
                    {search ? `No results for "${search}"` : 'Add your first entry to get started.'}
                  </EmptyDesc>
                </EmptyState>
              ) : visible.map(item => (
                <Card key={item.id} $busy={savingId === item.id}>
                  <CardTopRow>
                    <CardEmojiBox>{item.emoji}</CardEmojiBox>
                    <CardBadgeCol>
                      <TypeBadge $t={item.type}>{item.type}</TypeBadge>
                      <StatusBadge $s={item.status}>{item.status}</StatusBadge>
                    </CardBadgeCol>
                  </CardTopRow>
                  <CardTitle>{item.title}</CardTitle>
                  <CardMeta>
                    <MetaChip>{item.genre}</MetaChip>
                    {item.year     && <><MetaChip>·</MetaChip><MetaChip>{item.year}</MetaChip></>}
                    {item.episodes && <><MetaChip>·</MetaChip><MetaChip>{item.episodes} ep</MetaChip></>}
                    {item.rating   && <><MetaChip>·</MetaChip><MetaChip className="gold">★ {item.rating}/10</MetaChip></>}
                  </CardMeta>
                  {item.note && <CardNote>"{item.note}"</CardNote>}
                  <CardActions>
                    <ActBtn
                      onClick={() => openEdit(item)}
                      disabled={savingId === item.id}
                    >
                      {savingId === item.id ? <BtnSpinner /> : '✏️'} Edit
                    </ActBtn>
                    <ActBtn
                      $danger
                      onClick={() => setDelTarget(item)}
                      disabled={savingId === item.id}
                    >
                      🗑 Delete
                    </ActBtn>
                  </CardActions>
                </Card>
              ))}
            </Grid>
          )}
        </Main>

        {modal && (
          <Overlay onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
            <Modal>
              <ModalClose onClick={closeModal}>✕</ModalClose>
              <ModalTitle>
                {modal === 'add' ? '➕ Add New Entry' : '✏️ Edit Entry'}
              </ModalTitle>

              <FormGrid>
                <FormGroup>
                  <FormLabel>Type</FormLabel>
                  <FormSelect value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {TYPE_OPT.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </FormSelect>
                </FormGroup>

                <FormGroup>
                  <FormLabel>Status</FormLabel>
                  <FormSelect value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {STATUS_OPT.map(s => <option key={s} value={s}>{s}</option>)}
                  </FormSelect>
                </FormGroup>

                <FormFull>
                  <FormGroup>
                    <FormLabel>Title *</FormLabel>
                    <FormInput
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Enter title..."
                      className={errors.title ? 'error' : ''}
                    />
                  </FormGroup>
                </FormFull>

                <FormGroup>
                  <FormLabel>Genre *</FormLabel>
                  <FormSelect
                    value={form.genre}
                    onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}
                    style={{ borderColor: errors.genre ? C.red : '' }}
                  >
                    <option value="">Select genre</option>
                    {GENRE_OPT.map(g => <option key={g} value={g}>{g}</option>)}
                  </FormSelect>
                </FormGroup>

                <FormGroup>
                  <FormLabel>Year</FormLabel>
                  <FormInput
                    value={form.year}
                    onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                    placeholder="e.g. 2023"
                    type="number" min="1990" max="2030"
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Episodes</FormLabel>
                  <FormInput
                    value={form.episodes}
                    onChange={e => setForm(p => ({ ...p, episodes: e.target.value }))}
                    placeholder="e.g. 16"
                    type="number" min="1"
                  />
                </FormGroup>

                <FormFull>
                  <FormGroup>
                    <FormLabel>Rating (1–10) *</FormLabel>
                    <RatingRow>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <RatingStar
                          key={n} type="button"
                          $active={Number(form.rating) === n}
                          onClick={() => setForm(p => ({ ...p, rating: String(n) }))}
                        >{n}</RatingStar>
                      ))}
                    </RatingRow>
                  </FormGroup>
                </FormFull>

                <FormFull>
                  <FormGroup>
                    <FormLabel>Emoji</FormLabel>
                    <EmojiPicker>
                      {EMOJI_OPT.map(em => (
                        <EmojiOpt
                          key={em} type="button"
                          $active={form.emoji === em}
                          onClick={() => setForm(p => ({ ...p, emoji: em }))}
                        >{em}</EmojiOpt>
                      ))}
                    </EmojiPicker>
                  </FormGroup>
                </FormFull>

                <FormFull>
                  <FormGroup>
                    <FormLabel>Personal Note</FormLabel>
                    <FormTextarea
                      value={form.note}
                      onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                      placeholder="What did this make you feel..."
                    />
                  </FormGroup>
                </FormFull>
              </FormGrid>

              {apiError && <ModalError>{apiError}</ModalError>}

              <ModalBtns>
                <SaveBtn onClick={handleSave} disabled={isSavingNew || savingId === editItem?.id}>
                  {(isSavingNew || savingId === editItem?.id)
                    ? <><BtnSpinner /> Saving...</>
                    : modal === 'add' ? 'Add to Watchlist' : 'Save Changes'
                  }
                </SaveBtn>
                <CancelBtn onClick={closeModal}>Cancel</CancelBtn>
              </ModalBtns>
            </Modal>
          </Overlay>
        )}

        {delTarget && (
          <Overlay onClick={e => { if (e.target === e.currentTarget) setDelTarget(null); }}>
            <DeleteBox>
              <DeleteIcon>🗑️</DeleteIcon>
              <DeleteTitle>Remove from Watchlist?</DeleteTitle>
              <DeleteDesc>
                <strong style={{ color: C.dark }}>{delTarget.title}</strong> will be permanently removed. This cannot be undone.
              </DeleteDesc>
              <DeleteBtns>
                <DangerBtn onClick={handleDelete} disabled={savingId === delTarget.id}>
                  {savingId === delTarget.id ? <><BtnSpinner /> Removing...</> : 'Yes, Remove'}
                </DangerBtn>
                <CancelBtn onClick={() => setDelTarget(null)}>Keep It</CancelBtn>
              </DeleteBtns>
            </DeleteBox>
          </Overlay>
        )}

        {toast && (
          <Toast>
            <span>{toast.icon}</span>
            {toast.msg}
          </Toast>
        )}

      </PageWrap>
    </>
  );
}


const PageWrap = styled.div`
  min-height:100vh;background:${C.bg};position:relative;overflow-x:hidden;
  &::before{content:'';position:fixed;inset:0;
    background-image:linear-gradient(rgba(26,26,46,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,26,46,.04) 1px,transparent 1px);
    background-size:52px 52px;pointer-events:none;z-index:0;}
`;
const TopBar   = styled.header`position:sticky;top:0;left:0;right:0;height:58px;background:${C.bg};border-bottom:2px solid ${C.dark};display:flex;align-items:center;justify-content:space-between;padding:0 2.5rem;z-index:200;`;
const TBLeft   = styled.div`display:flex;align-items:center;gap:.75rem;`;
const TBRight  = styled.div`display:flex;align-items:center;gap:.75rem;`;
const GreenDot = styled.div`width:11px;height:11px;background:${C.green};border-radius:50%;animation:${pulse} 2.5s ease infinite;`;
const NavBrand = styled.span`font-family:'Syne',sans-serif;font-size:1.05rem;font-weight:800;color:${C.dark};letter-spacing:-.3px;em{font-style:normal;color:${C.green};}`;
const PillBtn  = styled.button`font-family:'Syne',sans-serif;font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${p=>p.$primary?C.bg:C.dark};background:${p=>p.$primary?C.dark:'transparent'};border:2px solid ${C.dark};padding:.38rem .9rem;border-radius:100px;cursor:pointer;transition:all .2s ease;display:flex;align-items:center;gap:.4rem;&:hover{background:${p=>p.$primary?C.green:C.dark};border-color:${p=>p.$primary?C.green:C.dark};color:${C.bg};}`;
const Main     = styled.main`max-width:1300px;margin:0 auto;padding:3rem 2.5rem 6rem;position:relative;z-index:1;animation:${fadeUp} .45s ease forwards;`;
const PageHeader= styled.div`margin-bottom:2.5rem;`;
const PageChip = styled.div`display:inline-flex;align-items:center;gap:.5rem;font-family:'Syne',sans-serif;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:${C.soft};border:1.5px solid ${C.border};background:${C.white};padding:.3rem .85rem;border-radius:100px;margin-bottom:1rem;span{width:6px;height:6px;background:${C.green};border-radius:50%;display:inline-block;animation:${pulse} 2s ease infinite;}`;
const PageTitle= styled.h1`font-family:'Syne',sans-serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;color:${C.dark};letter-spacing:-.04em;line-height:1.05;margin-bottom:.4rem;em{font-style:normal;color:${C.green};}`;
const PageDesc = styled.p`font-size:.92rem;color:${C.soft};max-width:520px;line-height:1.65;`;

const ErrorBanner = styled.div`display:flex;justify-content:space-between;align-items:center;background:${C.redLt};border:1px solid #f5b7b1;color:${C.red};padding:.75rem 1rem;border-radius:10px;font-size:.85rem;margin-bottom:1.5rem;animation:${fadeUp} .3s ease;`;
const DismissX   = styled.button`background:none;border:none;color:${C.red};cursor:pointer;font-size:.9rem;&:hover{opacity:.7;}`;
const ModalError = styled.div`background:${C.redLt};border:1px solid #f5b7b1;color:${C.red};padding:.65rem 1rem;border-radius:8px;font-size:.82rem;margin-top:1rem;`;

const StatsStrip = styled.div`display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;`;
const StatPill   = styled.div`background:${C.white};border:1.5px solid ${C.border};border-radius:12px;padding:.65rem 1.1rem;display:flex;align-items:center;gap:.5rem;`;
const StatNum    = styled.span`font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;color:${C.dark};`;
const StatLbl    = styled.span`font-family:'Syne',sans-serif;font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.soft};`;

const ControlsRow= styled.div`display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;`;
const SearchBox  = styled.div`flex:1;min-width:220px;max-width:360px;position:relative;input{width:100%;background:${C.white};border:1.5px solid ${C.border};border-radius:100px;padding:.5rem 1rem .5rem 2.5rem;font-family:'DM Sans',sans-serif;font-size:.88rem;color:${C.dark};outline:none;transition:border-color .2s;&::placeholder{color:${C.border};}&:focus{border-color:${C.green};}}span{position:absolute;left:.85rem;top:50%;transform:translateY(-50%);font-size:.85rem;color:${C.soft};pointer-events:none;}`;
const FilterTabs = styled.div`display:flex;gap:.5rem;flex-wrap:wrap;`;
const FilterTab  = styled.button`font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:.35rem .85rem;border-radius:100px;cursor:pointer;transition:all .18s ease;background:${p=>p.$active?C.dark:C.white};color:${p=>p.$active?C.bg:C.soft};border:1.5px solid ${p=>p.$active?C.dark:C.border};&:hover{border-color:${C.dark};color:${p=>p.$active?C.bg:C.dark};}`;
const SortSelect = styled.select`font-family:'Syne',sans-serif;font-size:.75rem;font-weight:700;color:${C.dark};background:${C.white};border:1.5px solid ${C.border};border-radius:100px;padding:.38rem .9rem;cursor:pointer;outline:none;transition:border-color .2s;&:focus{border-color:${C.green};}`;

const LoadingState = styled.div`display:flex;align-items:center;gap:.75rem;color:${C.soft};font-size:.9rem;padding:3rem 0;`;
const LoadSpinner  = styled.span`display:inline-block;width:18px;height:18px;border:2px solid ${C.border};border-top-color:${C.green};border-radius:50%;animation:${spin} .65s linear infinite;flex-shrink:0;`;
const BtnSpinner   = styled.span`display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:${spin} .65s linear infinite;flex-shrink:0;`;

const Grid = styled.div`display:grid;grid-template-columns:repeat(auto-fill,minmax(288px,1fr));gap:1.4rem;`;
const Card = styled.div`background:${C.white};border:1.5px solid ${C.border};border-radius:18px;padding:1.5rem;display:flex;flex-direction:column;gap:.6rem;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease,opacity .2s ease;position:relative;overflow:hidden;opacity:${p=>p.$busy?.5:1};&:hover{transform:translateY(-4px);box-shadow:0 14px 36px rgba(26,26,46,.09);border-color:${C.green};}`;
const CardTopRow   = styled.div`display:flex;justify-content:space-between;align-items:flex-start;`;
const CardEmojiBox = styled.div`width:48px;height:48px;border-radius:14px;background:${C.muted};border:1.5px solid ${C.border};display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;`;
const CardBadgeCol = styled.div`display:flex;flex-direction:column;align-items:flex-end;gap:.35rem;`;
const StatusBadge  = styled.span`font-family:'Syne',sans-serif;font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:${p=>STATUS_COLOR[p.$s]?.bg||C.muted};color:${p=>STATUS_COLOR[p.$s]?.color||C.soft};border:1.5px solid ${p=>STATUS_COLOR[p.$s]?.border||C.border};padding:.2rem .6rem;border-radius:100px;`;
const TypeBadge    = styled.span`font-family:'Syne',sans-serif;font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:${p=>TYPE_COLOR[p.$t]?.bg||C.muted};color:${p=>TYPE_COLOR[p.$t]?.color||C.soft};border:1.5px solid ${p=>TYPE_COLOR[p.$t]?.border||C.border};padding:.2rem .6rem;border-radius:100px;`;
const CardTitle    = styled.div`font-family:'Syne',sans-serif;font-size:1.05rem;font-weight:800;color:${C.dark};line-height:1.2;`;
const CardMeta     = styled.div`display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;`;
const MetaChip     = styled.span`font-size:.75rem;color:${C.soft};&.gold{color:${C.gold};font-weight:700;}`;
const CardNote     = styled.p`font-size:.82rem;color:${C.soft};font-style:italic;line-height:1.5;border-top:1px solid ${C.muted};padding-top:.6rem;margin-top:.2rem;`;
const CardActions  = styled.div`display:flex;gap:.5rem;margin-top:.4rem;`;
const ActBtn = styled.button`flex:1;padding:.42rem .75rem;border-radius:100px;cursor:pointer;font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;transition:all .18s ease;background:${p=>p.$danger?C.redLt:C.muted};color:${p=>p.$danger?C.red:C.dark};border:1.5px solid ${p=>p.$danger?'#f5b7b1':C.border};display:inline-flex;align-items:center;justify-content:center;gap:.35rem;&:hover:not(:disabled){background:${p=>p.$danger?C.red:C.dark};color:${C.bg};border-color:${p=>p.$danger?C.red:C.dark};}&:disabled{opacity:.45;cursor:not-allowed;}`;

const EmptyState = styled.div`grid-column:1/-1;display:flex;flex-direction:column;align-items:center;padding:5rem 2rem;text-align:center;`;
const EmptyIcon  = styled.div`font-size:3rem;margin-bottom:1rem;`;
const EmptyTitle = styled.div`font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;color:${C.dark};margin-bottom:.4rem;`;
const EmptyDesc  = styled.div`font-size:.88rem;color:${C.soft};`;

const Overlay    = styled.div`position:fixed;inset:0;background:rgba(26,26,46,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:900;padding:1.5rem;animation:${overlayIn} .2s ease forwards;`;
const Modal      = styled.div`background:${C.white};border:1.5px solid ${C.border};border-radius:22px;padding:2rem 2.25rem;width:100%;max-width:520px;box-shadow:0 24px 60px rgba(26,26,46,.18);position:relative;max-height:90vh;overflow-y:auto;animation:${modalIn} .28s cubic-bezier(.34,1.56,.64,1) forwards;&::-webkit-scrollbar{width:5px;}&::-webkit-scrollbar-thumb{background:${C.border};border-radius:5px;}`;
const ModalClose = styled.button`position:absolute;top:1rem;right:1rem;background:${C.muted};border:1.5px solid ${C.border};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.95rem;color:${C.soft};transition:all .2s ease;&:hover{background:${C.dark};color:${C.bg};border-color:${C.dark};}`;
const ModalTitle = styled.h2`font-family:'Syne',sans-serif;font-size:1.25rem;font-weight:800;color:${C.dark};letter-spacing:-.02em;margin-bottom:1.5rem;display:flex;align-items:center;gap:.6rem;`;
const FormGrid   = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:1rem;@media(max-width:480px){grid-template-columns:1fr;}`;
const FormFull   = styled.div`grid-column:1/-1;`;
const FormGroup  = styled.div`display:flex;flex-direction:column;gap:.4rem;`;
const FormLabel  = styled.label`font-family:'Syne',sans-serif;font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${C.soft};`;
const FormInput  = styled.input`background:${C.bg};border:1.5px solid ${C.border};border-radius:10px;padding:.55rem .85rem;font-family:'DM Sans',sans-serif;font-size:.9rem;color:${C.dark};outline:none;transition:border-color .2s;&::placeholder{color:${C.border};}&:focus{border-color:${C.green};background:${C.white};}&.error{border-color:${C.red};animation:${shake} .35s ease;}`;
const FormSelect = styled.select`background:${C.bg};border:1.5px solid ${C.border};border-radius:10px;padding:.55rem .85rem;font-family:'DM Sans',sans-serif;font-size:.9rem;color:${C.dark};outline:none;cursor:pointer;transition:border-color .2s;&:focus{border-color:${C.green};background:${C.white};}`;
const FormTextarea=styled.textarea`background:${C.bg};border:1.5px solid ${C.border};border-radius:10px;padding:.55rem .85rem;font-family:'DM Sans',sans-serif;font-size:.9rem;color:${C.dark};outline:none;resize:vertical;min-height:80px;transition:border-color .2s;&::placeholder{color:${C.border};}&:focus{border-color:${C.green};background:${C.white};}`;
const EmojiPicker= styled.div`display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.25rem;`;
const EmojiOpt   = styled.button`width:36px;height:36px;border-radius:8px;font-size:1.1rem;border:1.5px solid ${p=>p.$active?C.dark:C.border};background:${p=>p.$active?C.muted:C.bg};cursor:pointer;transition:all .15s ease;display:flex;align-items:center;justify-content:center;&:hover{border-color:${C.dark};background:${C.muted};}`;
const RatingRow  = styled.div`display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;`;
const RatingStar = styled.button`width:32px;height:32px;border-radius:8px;border:1.5px solid ${p=>p.$active?C.gold:'#e8e3d0'};background:${p=>p.$active?C.goldLt:C.bg};color:${p=>p.$active?C.gold:'#c8c3b8'};cursor:pointer;transition:all .15s ease;font-weight:700;font-family:'Syne',sans-serif;font-size:.78rem;&:hover{border-color:${C.gold};background:${C.goldLt};color:${C.gold};}`;
const ModalBtns  = styled.div`display:flex;gap:.75rem;margin-top:1.5rem;`;
const SaveBtn    = styled.button`flex:1;padding:.75rem 1rem;background:${C.dark};color:${C.bg};border:2px solid ${C.dark};border-radius:100px;font-family:'Syne',sans-serif;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .2s ease;letter-spacing:.3px;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;&:hover:not(:disabled){background:${C.green};border-color:${C.green};transform:translateY(-2px);box-shadow:0 6px 16px rgba(45,106,79,.25);}&:active:not(:disabled){transform:translateY(0);}&:disabled{opacity:.5;cursor:not-allowed;}`;
const CancelBtn  = styled.button`flex:1;padding:.75rem 1rem;background:transparent;color:${C.soft};border:1.5px solid ${C.border};border-radius:100px;font-family:'Syne',sans-serif;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .2s ease;&:hover{border-color:${C.dark};color:${C.dark};transform:translateY(-2px);}&:active{transform:translateY(0);}`;

const DeleteBox  = styled.div`background:${C.white};border:1.5px solid ${C.border};border-radius:20px;padding:2rem 2.25rem;width:100%;max-width:400px;text-align:center;box-shadow:0 24px 60px rgba(26,26,46,.18);animation:${modalIn} .25s cubic-bezier(.34,1.56,.64,1) forwards;`;
const DeleteIcon = styled.div`font-size:2.5rem;margin-bottom:.75rem;`;
const DeleteTitle= styled.div`font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;color:${C.dark};margin-bottom:.4rem;`;
const DeleteDesc = styled.div`font-size:.88rem;color:${C.soft};margin-bottom:1.5rem;line-height:1.55;`;
const DeleteBtns = styled.div`display:flex;gap:.75rem;`;
const DangerBtn  = styled.button`flex:1;padding:.7rem 1rem;background:${C.red};color:${C.bg};border:2px solid ${C.red};border-radius:100px;font-family:'Syne',sans-serif;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .2s ease;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;&:hover:not(:disabled){background:#c0392b;border-color:#c0392b;transform:translateY(-2px);}&:active:not(:disabled){transform:translateY(0);}&:disabled{opacity:.5;cursor:not-allowed;}`;

const Toast = styled.div`position:fixed;bottom:2rem;right:2rem;background:${C.dark};color:${C.bg};border-radius:14px;padding:.8rem 1.25rem;font-family:'Syne',sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.3px;z-index:9999;display:flex;align-items:center;gap:.6rem;box-shadow:0 8px 28px rgba(26,26,46,.25);animation:${fadeUp} .3s ease forwards;`;