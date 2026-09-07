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
- `ui.js` / `main.js`: DOM描画、入力、アプリケーション結線

## Data Flow

現在状態とシナリオを表示し、入力した意思決定を計算層へ渡します。計算結果から状態と月次レポートを更新し、継続時は新状態を使って次シナリオを選びます。

## External Services

なし。

## Deployment

`npm start`でローカル静的サーバーを起動します。

## Key Constraints

永続化、ログイン、外部APIを使わず、リロード時には状態を破棄します。
