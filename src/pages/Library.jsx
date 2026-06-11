import { RiPlayListLine, RiDeleteBin6Line, RiMusicLine, RiDraggable, RiDeleteBinLine } from 'react-icons/ri';
import { useYami } from '../context/YamiContext';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableRow({ track, index, isCurrent, onPlay, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.trackId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'default',
  };
  const dur = track.trackTimeMillis
    ? `${Math.floor(track.trackTimeMillis / 60000)}:${String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`
    : '—';

  return (
    <tr ref={setNodeRef} style={style} className={`track-row${isCurrent ? ' playing' : ''}`}
      onClick={() => onPlay(track)}>
      <td className="col-num">
        <span className="drag-handle" {...attributes} {...listeners} onClick={e => e.stopPropagation()}>
          <RiDraggable />
        </span>
        <span className="row-num">{index + 1}</span>
      </td>
      <td>
        <div className="track-cell-info">
          {track.artworkUrl60
            ? <img src={track.artworkUrl60} alt={track.trackName} className="track-thumb" />
            : <div className="track-thumb-ph"><RiMusicLine /></div>}
          <div style={{ minWidth: 0 }}>
            <div className="track-name">{track.trackName}</div>
            <div className="track-artist">{track.artistName}</div>
          </div>
        </div>
      </td>
      <td className="col-alb"><span className="track-album">{track.collectionName || '—'}</span></td>
      <td className="track-dur">{dur}</td>
      <td className="col-act">
        <div className="track-actions">
          <button className="track-act-btn danger" title="Remove"
            onClick={e => { e.stopPropagation(); onRemove(track.trackId); }}>
            <RiDeleteBin6Line />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Library() {
  const { queue, setQueue, removeFromQueue, playTrack, currentTrack, showToast } = useYami();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = queue.findIndex(t => t.trackId === active.id);
    const newIdx = queue.findIndex(t => t.trackId === over.id);
    setQueue(arrayMove(queue, oldIdx, newIdx));
  };

  const clearQueue = () => {
    setQueue([]);
    showToast('Queue cleared', 'remove');
  };

  return (
    <main className="yami-main">
      <div className="page-hero" style={{ background: 'linear-gradient(135deg,#047857,#1d4ed8)' }}>
        <div className="page-hero-icon"><RiPlayListLine /></div>
        <div className="page-hero-content">
          <p className="page-hero-kicker">Queue</p>
          <h1 className="page-hero-title">Up Next</h1>
          <p className="page-hero-sub">{queue.length} track{queue.length !== 1 ? 's' : ''}</p>
          {queue.length > 0 && (
            <div className="page-hero-actions">
              <button className="hero-shuffle-btn" onClick={clearQueue}>
                <RiDeleteBinLine /> Clear Queue
              </button>
            </div>
          )}
        </div>
      </div>

      {queue.length === 0
        ? <div className="empty-state" style={{ marginTop: 24 }}>
            <RiPlayListLine />
            <p>Your queue is empty</p>
            <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>Add songs from Search or Browse</p>
          </div>
        : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={queue.map(t => t.trackId)} strategy={verticalListSortingStrategy}>
              <table className="track-table" style={{ marginTop: 20 }}>
                <thead className="track-table-head">
                  <tr><th className="col-num"></th><th>Title</th><th className="col-alb">Album</th><th className="col-dur" style={{textAlign:'right'}}>Duration</th><th className="col-act"/></tr>
                </thead>
                <tbody>
                  {queue.map((track, i) => (
                    <SortableRow key={track.trackId} track={track} index={i}
                      isCurrent={currentTrack?.trackId === track.trackId}
                      onPlay={playTrack} onRemove={removeFromQueue} />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        )}
    </main>
  );
}
