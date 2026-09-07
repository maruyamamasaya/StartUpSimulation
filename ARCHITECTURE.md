# Architecture

## System Overview

ブラウザ内で完結する単一画面の経営シミュレーションです。サーバーは静的ファイルの配信だけを担い、ゲーム状態はブラウザのメモリにのみ保持します。

## Technology Stack

- HTML / CSS / JavaScript (ES modules)
- Node.js標準HTTPサーバーと標準テストランナー
- 外部ランタイム依存なし

## Major Components

- `state.js`: 初期状態、操作範囲、企業価値
- `scenarios.js`: 追加可能なシナリオ定義と状態依存の重み付き選択
- `random.js`: 判断適合度と制御された乱数範囲
- `calculations.js`: 顧客、満足度、解約、収支の純粋計算
- `decisionScore.js`: 公開情報と意思決定に基づく経営判断スコア、CEO信任度
- `execution.js`: 判断後の広告・採用・開発の実行ブレと複合重大事故
- `growthRisk.js`: 成長段階別リスク、複数ターンのイベント連鎖と回復
- `turn.js`: ターン進行、倒産、最終評価
- `strategy.js`: 選択戦略ごとの計算・最終評価の重み
- `competition.js`: 3競合の簡易AI、市場シェア、競合シグナル
- `meeting.js`: 状態に基づくCFO/CMO/CTO/COOの経営会議コメント
- `data/businesses.js`: 10事業の初期規模と共通モデルへの補正
- `data/balance.js`: 警告、失敗、成功に関する調整可能な閾値
- `save.js`: バージョン付きセーブデータの直列化・検証
- `ui.js` / `main.js`: DOM描画、入力、アプリケーション結線

## Data Flow

開始画面で事業プロファイルと戦略を選び、事業補正付きの共通計算モデルへ意思決定を渡します。意思決定を先に採点してから、施策の実行ブレと競合施策を抽選し、競合の価格・商品力・ブランド・シェアを顧客行動へ反映します。投資の遅延効果を保留キューで管理し、競合AI・市場フェーズ・市場規模を四半期ごとに更新します。複合リスクは警告を経て終了判定へ進み、成功ルートも同じ評価層で判定します。各四半期終了時の状態はブラウザのlocalStorageへ自動保存します。

## External Services

なし。

## Deployment

`npm start`でローカル静的サーバーを起動します。

## Key Constraints

永続化、ログイン、外部APIを使わず、リロード時には状態を破棄します。
