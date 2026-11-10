import { Modal } from './Modal';
import { useApp } from '../state/store';
import { t } from '../i18n';

export function Help() {
  const set = useApp((s) => s.set);
  return (
    <Modal title={t('help.title')} onClose={() => set({ overlay: null })} testId="help">
      <div className="help">
        <p>ATELIER 是免登入、直接在瀏覽器中使用的虛擬繪畫工作室。點擊畫架或「開始創作」，選擇紙張與畫布、尺寸與媒材後即可開始作畫。</p>
        <h4>筆觸與筆壓</h4>
        <ul>
          <li><b>A 固定筆觸</b>：線條依設定尺寸繪製，不受速度影響。</li>
          <li><b>B 動態筆觸</b>（滑鼠／觸控預設）：移動越快線條越細越淡、越慢越寬越濃；在同一處停留會依媒材增加顏料沉積、墨色暈開或水彩積色；快速抬起會自然收筆。</li>
          <li><b>C 繪圖筆</b>：支援的繪圖筆會讀取真實的 pressure 與 tiltX／tiltY；若裝置未回報真實壓力，系統會自動改用模擬，不會把滑鼠的固定值當成筆壓。</li>
          <li>每種媒材有各自的反應模型，可在右側面板關閉「動態筆觸模擬」。</li>
        </ul>
        <h4>媒材</h4>
        <ul>
          <li><b>素描</b>：2H～6B 鉛筆、炭筆依筆壓填入紙紋凹處；紙擦筆可推開石墨；橡皮擦可擦除。</li>
          <li><b>水彩</b>：半透明疊色、收筆後擴散、邊緣積色、顆粒沉澱；在仍濕潤的區域再畫會產生濕中濕暈染；清水筆可洗淡並預先打濕紙面；海綿可拍出多孔肌理。</li>
          <li><b>水墨</b>：筆鋒隨筆壓展開、墨量隨行筆消耗形成枯筆飛白；含水量越高墨色越淡；生宣會產生纖維暈染。</li>
          <li><b>壓克力／油畫</b>：不透明覆蓋、刷毛紋理、厚塗明暗、筆刷會沾取畫布上的濕顏料混色；刮刀可平塗厚漆或刮出乾刷效果。</li>
        </ul>
        <h4>快捷鍵</h4>
        <p><kbd>B</kbd> 筆刷 <kbd>E</kbd> 橡皮擦 <kbd>I</kbd> 吸色 <kbd>H</kbd>／按住 <kbd>Space</kbd> 移動 <kbd>Z</kbd> 放大鏡（Alt 縮小） <kbd>[</kbd> <kbd>]</kbd> 筆刷大小 <kbd>X</kbd> 切換前景／背景色 <kbd>Ctrl</kbd>+<kbd>Z</kbd> 復原 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> 重做 <kbd>0</kbd> 符合視窗 <kbd>Tab</kbd> 專注模式。滑鼠滾輪縮放、觸控板雙指平移、觸控雙指縮放與平移。</p>
        <h4>創作過程回放</h4>
        <p>每一筆的軌跡、時間、筆壓與停留都被記錄。按下「播放創作過程」可縮時或依原速重播，也能匯出縮時影片（MP4 或 WebM，依瀏覽器支援）。</p>
        <h4>儲存</h4>
        <p className="notice">{t('home.storageNote')}</p>
        <p>作品會自動儲存。可匯出 PNG／JPG，或匯出可重新編輯的「.atelier.json」專案檔（包含圖層、筆觸資料、畫布與媒材設定），在其他裝置的「我的作品 → 匯入專案檔」繼續創作。</p>
        <h4>關於模擬的限制</h4>
        <p className="small muted">媒材效果為即時近似模擬，不是完整的流體動力學或顏料光學計算；混色使用 RGB 近似減色混合，與真實顏料仍有差異。</p>
      </div>
    </Modal>
  );
}
