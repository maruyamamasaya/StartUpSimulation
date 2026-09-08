# AI Agent Guide

## Project Context

- **Project Name**: Formula Company (`package.json`では`formula-company`)
- **Purpose**: 背景となる市場シグナルと会社の状態を読み、価格・広告・採用・開発を判断しながら、5年間・20四半期にわたって会社を経営するローカルブラウザ向け経営シミュレーション。
- **Primary Stack**: HTML / CSS / JavaScript（ES modules）、Node.js 20以上の標準HTTPサーバー・標準テストランナー。外部ランタイム依存、外部API、データベースは使用しない。
- **Main Domains**: 会社・KPIと四半期進行、市場シグナルと市場フェーズ、事業プロファイルと戦略、価格・広告・採用・開発の意思決定、競合、投資プロジェクト、成長リスク、経営判断評価と終了・成功条件、localStorageセーブ、レスポンシブUI、プレイヤーガイド。
- **Expected Work**: ゲームバランスと計算ロジック、シナリオ・競合・リスク・投資・セーブ、ブラウザUIとアクセシビリティ、Node.jsテスト、静的配信、設計文書・プレイヤー文書の保守。新領域や新技術を含む正当な機能追加も、調査と合意を経れば対象になり得る。
- **Clearly Unrelated Examples**: 別製品固有のSwiftUI画面やXcodeプロジェクトの修正、Formula Companyに存在しない別サービス固有のNext.jsページ・DBスキーマ・クラス・ディレクトリを前提とする作業、別リポジトリの製品名と固有機能を複数指定した変更。React、Python、Swift、SQLite、API、Docker、database等の一般技術名が単独で現れるだけでは無関係と判定しない。

## Project Context Guard

ユーザー要求を受領したら、実装やコマンド実行より先に、その要求と上記Project Contextの整合性を次の3段階で判定する。この確認はAIエージェントが毎セッション行う軽量な事前確認であり、外部APIや分類システムは使わない。

### MATCH

現在の目的、機能領域、コード、文書、または開発・運用作業と明確に関連する要求。通常の開発フローへ進む。

### UNCERTAIN

このプロジェクトで実現可能だが、新技術・新領域・大きな構成変更を含む、または文脈だけでは所属を確定できない要求。拒否せず、`CURRENT.md`と関連する正本を読み、検索で対象・参照元・既存テストを確認してから、作業可能か、ユーザー確認が必要かを判断する。迷う場合はMISMATCHではなくUNCERTAINとし、正当な新機能を妨げない。

### MISMATCH

別プロジェクト名、別製品固有機能、存在しない固有ファイル・クラス・DB・ディレクトリ、明確に異なるプラットフォームなど、複数の矛盾するシグナルから別プロジェクト向けだと高い確信で判断できる要求。単一キーワードや一般技術名だけでは判定しない。

MISMATCHの場合は直ちに停止し、それ以降のツール・ターミナルコマンド実行、ファイル変更・新規作成、パッケージ追加、DB変更、destructive command、commit、pushを行わない。応答では次だけを簡潔に示す。

- **Current Project**: Formula Company
- **Reason**: Mismatchと判断した理由
- **Conflicting Prompt Elements**: プロンプト内の具体的な不一致要素
- **No files were modified**

## Repository Boundaries

- 読み取り調査の開始時に現在のGit rootを確認し、変更・検証・commitの対象がそのroot内であることを確認する。
- 原則としてGit root外のファイルや別リポジトリを読み書き・変更しない。
- ユーザーが別リポジトリの操作を明示的に依頼した場合だけ、その対象と境界を確認したうえで例外とする。

## 基本行動

`ユーザー要求 → AGENTS.md → CURRENT.md → 必要な設計文書 → 検索 → 対象コード → 影響範囲 → 関連テスト → 変更 → 検証 → 必要な文書更新`

コードが生成された後は、無差別にファイルを読まず、検索して対象を特定してから必要部分だけを読みます。

- 概念しか分からない: semantic/repository search
- symbol名が分かる: symbol/exact search
- 特定文字列: `rg`、`git grep`等
- 呼び出し元: references search
- 影響範囲: referencesと関連テスト

特定ツールを前提にせず、利用可能な手段から適切なものを選びます。

## 作業原則

- 既存仕様と正本を尊重し、推測を事実として固定しない。
- 最小変更を優先し、無関係なリファクタリングを避ける。
- 後から理由が必要になる重要な設計判断だけをADRへ残す。
- ドキュメントと実装の不整合を放置しない。
- 秘密情報、credential、token、個人情報の実値を記録しない。
- 現時点では実装、技術固有設定、CODEMAP、階層型AGENTS、verify script、sessionsを作らない。

## Source of Truth

| 正本 | 管理対象 |
| --- | --- |
| `CURRENT.md` | 現在の状態（履歴ではない） |
| `ARCHITECTURE.md` | 現在のシステム構造 |
| `DOMAIN.md` | 業務概念・ルール |
| `DATA_MODEL.md` | 永続化モデル |
| `ROADMAP.md` | 今後の優先順位 |
| `TESTING.md` | 検証方針 |
| `SECURITY.md` | セキュリティ方針 |
| `decisions/` | 重要な設計判断と理由 |
| Git history | 変更履歴 |

詳細は該当する正本へ集約し、他文書からリンクします。

## Context Budget

必要になった段階だけ次へ進み、毎回すべてを読みません。

1. Level 1: `AGENTS.md` + `CURRENT.md`
2. Level 2: 関連する設計文書
3. Level 3: 検索結果
4. Level 4: 対象コード
5. Level 5: 依存先・参照元・テスト

## Progressive Documentation

次の条件を満たした時だけ追加します。

- **`CODEMAP.md`**: 複数のFeature領域が存在する、構造だけでは位置を予測しづらい、または検索開始の安定した入口が必要な場合。全ファイル一覧にはしない。
- **階層型`AGENTS.md`**: 独立した技術スタック、検証方法、変更ルール、または強い責務境界がある場合。小さなディレクトリ単位では作らない。
- **Verify Script**: lint/typecheck/test/build等の確立済みコマンドを単一の検証入口へまとめる価値がある場合。技術スタック決定前は作らない。
- **`docs/architecture/`**: `ARCHITECTURE.md`だけでは詳細設計を簡潔に説明できない場合。`ARCHITECTURE.md`は全体要約・索引として維持する。
- **`docs/operations/`**: デプロイ、監視、バックアップ、障害対応、環境管理など実際の運用情報が必要な場合。
- **`sessions/`**: Git履歴、`CURRENT.md`、`ROADMAP.md`、ADRで不足する重要な引き継ぎ情報が実際に発生した場合のみ。AIの全作業ログにはしない。

## Documentation Hygiene

巨大な`AGENTS.md`/`CURRENT.md`、全ファイル一覧型CODEMAP、READMEへの全情報集約、無制限のAI作業ログ、説明の複製、コードの大量貼り付け、Git履歴で分かる情報の再記録を避けます。古い調査文書を正本として扱わず、習慣的な追記で文書を肥大化させません。詳細は正本へ集約し、他文書はリンクします。
