# Testing

## Testing Strategy

乱数注入可能な純粋関数としてゲーム計算を検証し、判断と結果の因果、状態依存選択、終了条件を固定乱数で再現します。UIはローカルサーバーで目視確認します。

## Validation Matrix

| 変更タイプ | 必要な検証 |
| --- | --- |
| 数式・状態・シナリオ | `npm test`、`npm run check`、ゲーム通し確認 |
| UI・スタイル | `npm run check`、デスクトップ・モバイル幅で目視 |
| 文書 | 文書間リンクと実装との整合確認 |

## Fast Validation

`npm test`

## Full Validation

`npm run check`に加え、20四半期完走、倒産、CRISIS MODE、リスタートをブラウザで確認します。

## Unit Test

Node.js標準テストランナーを使用します。外部依存はありません。

## Manual Verification

背景、操作、四半期結果、年次レビュー、解説、最終評価が1画面の流れとして表示され、狭い画面でも横にはみ出さないことを確認します。
