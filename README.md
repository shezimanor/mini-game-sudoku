# React Sudoku

以 React 19 + TypeScript + Vite 實作的數獨遊戲。純前端、無後端，題目由瀏覽器即時運算產生。

## 遊戲玩法

進入頁面後選擇難度，系統即時產生一份**保證唯一解**的題目。

| 難度 | 給定數字 | 空格 |
| --- | --- | --- |
| 簡單 | 40–45 | 36–41 |
| 中等 | 32–36 | 45–49 |
| 困難 | 26–30 | 51–55 |

每局有 **3 次答錯機會**。填入的數字會立刻與正解比對：填對即鎖定，填錯會播放一段回饋動畫、扣除一次機會並清空該格。三次用盡遊戲結束；全部填對則顯示完成時間。

## 功能

- **即時產題**：回溯法產生正解後隨機挖空，每挖一格驗證唯一解是否仍然成立
- **Web Worker**：產題運算在背景執行緒進行，UI 不會凍結
- **計時與暫停**：`hh:mm:ss` 計時，暫停時以模糊遮罩蓋住盤面，避免暫停後繼續看題
- **筆記**：右鍵（或長按）開啟筆記面板記錄候選數字，同列同行同宮已出現的數字自動禁用；確定答案後會自動清除關聯格中相同的筆記
- **十字高亮**：游標經過格子時高亮整列與整行
- **鍵盤操作**：面板開啟時可用 1–9 輸入，`N` 切換筆記模式，Backspace 清空筆記，Esc 關閉面板
- **響應式**：盤面隨視窗連續縮放，手機上不需捲動；數字面板維持 44px 觸控目標
- **無障礙**：支援 `prefers-reduced-motion`，改以顏色與停留時間取代晃動動畫，不會因此失去回饋

## 開始使用

```bash
npm install
```

```bash
npm run dev
```

其他指令：

```bash
npm run build
```

```bash
npm run lint
```

## 專案結構

```
docs/
  SPEC.md                    完整規格書
src/
  App.tsx                    遊戲狀態機與流程
  constants.ts               答錯上限、錯誤動畫時序
  sudoku/
    logic.ts                 產生正解、挖空、唯一解驗證
    generator.worker.ts      產題 Web Worker
    requestPuzzle.ts         Worker 呼叫、最短載入時間、逾時重試、競態取消
    peers.ts                 關聯格計算
  hooks/
    useTimer.ts              計時、暫停接續、時間格式化
  components/                Board / Hud / NumberPad / Modal / Skeleton
```

## 規格書

功能、視覺、技術三層的完整規格記錄在 [docs/SPEC.md](docs/SPEC.md)，包含所有決策的理由與演進過程。程式碼中的 `FR-x.x` 註解都對應到規格書中的條目。

## 開發方式

本專案由 [Claude Code](https://claude.com/claude-code) 協助開發。開發流程是先與 Claude 對話釐清需求、逐步累積成規格書，再依規格書實作——`docs/SPEC.md` 的變更紀錄完整保留了這個過程。
