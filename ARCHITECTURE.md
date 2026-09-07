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
- `turn.js`: ターン進行、倒産、最終評価
- `strategy.js`: 選択戦略ごとの計算・最終評価の重み
- `competition.js`: 3競合の簡易AI、市場シェア、競合シグナル
- `meeting.js`: 状態に基づくCFO/CMO/CTO/COOの経営会議コメント
- `ui.js` / `main.js`: DOM描画、入力、アプリケーション結線

## Data Flow

現在状態とシグナルを表示し、入力した意思決定を計算層へ渡します。投資の遅延効果を保留キューで管理し、競合AI・市場フェーズ・市場規模を四半期ごとに更新します。計算結果から状態と四半期レポートを更新し、継続時は新状態を使って次シグナルを選びます。4四半期ごとに年次レビューを表示します。

## External Services

なし。

## Deployment

`npm start`でローカル静的サーバーを起動します。

## Key Constraints

永続化、ログイン、外部APIを使わず、リロード時には状態を破棄します。
