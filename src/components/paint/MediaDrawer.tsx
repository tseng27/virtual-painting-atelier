import { BRUSHES, CATEGORY_ORDER } from '../../painting/brushes/presets';
import { activeBrushId, useApp } from '../../state/store';
import { getEngine } from '../../state/session';
import { t } from '../../i18n';
import { BrushPreview } from './BrushPreview';
import { Icon } from '../Icon';

export function MediaDrawer() {
  const sel = useApp((s) => activeBrushId(s));
  const selectBrush = useApp((s) => s.selectBrush);
  const set = useApp((s) => s.set);
  const e = getEngine();
  if (!e) return null;
  const rec = e.surface.def.recommended;
  const order = [...CATEGORY_ORDER].sort((a, b) => (rec.includes(a) ? rec.indexOf(a) : 9) - (rec.includes(b) ? rec.indexOf(b) : 9));
  return (
    <div className="float media-drawer" data-testid="media-drawer">
      <div className="panel-h"><h5>{t('tool.media')}</h5><button className="icon-btn" onClick={() => set({ mediaOpen: false })} aria-label={t('common.close')}><Icon name="close" /></button></div>
      {order.map((cat) => (
        <div className="media-cat" key={cat}>
          <h6>{t(`medium.${cat}`)}{rec.includes(cat) && <span className="rec">{t('setup.recommended')}</span>}</h6>
          <div className="brush-grid">
            {BRUSHES.filter((b) => b.category === cat).map((b) => (
              <button key={b.id} className={`brush-tile${sel === b.id ? ' sel' : ''}`} data-testid={`brush-${b.id}`} onClick={() => { selectBrush(b.id); set({ mediaOpen: false }); }}>
                <BrushPreview preset={b} surface={e.surface} color={b.defaultColor ?? '#333333'} />
                {t(`brush.${b.id}`)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
