# 訪問者カウンターの設置手順

サポートページ下部の「今まで訪れた剣士達／今日訪れた剣士達」を動かすための準備です。
Cloudflare の無料枠だけで動きます。費用はかかりません。

パソコンにソフトを入れる必要はありません。すべてブラウザ上の操作で終わります。

---

## 何をしているか

- 数えているのは **「初めて訪れたブラウザの数」** だけです。
- IPアドレス、Cookie、閲覧履歴、端末を見分ける情報は **受け取りも保存もしません**。
- 同じ人を二重に数えないための判定は、**訪問者の端末の中だけ**で行います。
- Cloudflare に保存されるのは、次の2種類の数字だけです。
  - `total` … これまでの累計
  - `day:2026-09-12` … その日の分（日本時間。40日で自動的に消えます）

---

## 手順

### 1. Cloudflare に登録する

1. https://dash.cloudflare.com/sign-up でアカウントを作る（無料）。
2. メールの確認を済ませる。
   - ドメインの購入や追加は **不要** です。求められても飛ばしてください。

### 2. 数字の保存場所（KV）を作る

1. 左のメニューから **Storage & Databases** → **KV** を開く。
2. **Create a namespace** を押す。
3. 名前に `kendo-support-counter` と入れて作成する。

### 3. Worker を作る

1. 左のメニューから **Compute (Workers)** → **Workers & Pages** を開く。
2. **Create** → **Start with Hello World!** → **Deploy** の順に進む。
   - 名前は `kendo-support-counter` にしてください。
     （アドレスが `https://kendo-support-counter.<アカウント名>.workers.dev` になります）
3. 作成後の画面で **Edit code** を押す。
4. 表示されているコードを **すべて消して**、このフォルダの `worker.js` の中身を貼り付ける。
5. 右上の **Deploy** を押す。

### 4. Worker と KV をつなぐ

1. Worker の画面で **Settings** → **Bindings** を開く。
2. **Add binding** → **KV namespace** を選ぶ。
3. 次のとおり入力する。
   - **Variable name**: `COUNTER` ← **大文字で、この綴りのとおりに**
   - **KV namespace**: 手順2で作った `kendo-support-counter`
4. 保存する。保存すると自動で反映されます。

### 5. 動いているか確かめる

Worker の画面に出ているアドレス（`https://....workers.dev`）をブラウザで開きます。

```
{"total":0,"today":0}
```

このように表示されれば成功です。

> `COUNTER is not defined` のようなエラーが出る場合は、手順4の **Variable name** の綴りを見直してください。

### 6. 設置済みのアドレス

```
https://kendo-support-counter.shusosai.workers.dev
```

`index.html` の `ENDPOINT` に設定済み（2026-09-12 設置）。

---

## 補足

- 数字が取得できないときは、何も表示しません（訪問者にエラーは見えません）。
- ブラウザのデータを消した方は、次に訪れたときに改めて1人と数えられます。厳密な実人数ではなく、おおよその数です。
- 無料枠の書き込み上限は1日1,000回です。1日に新しく訪れる方が500人を超えると、超えた分は数えられません。そこまで増えたら別の方式に変えます。

---

## デプロイ記録（2026-10-26から）

GitHubのソースを記録することと、Cloudflareでそのソースが稼働していることの確認は別です。
不明な値を推測で記入せず、「未確認」のまま残します。コミットIDは、そのソースを含むコミットを記録します。
このREADMEを更新したコミットが、Workerをデプロイしたコミットになるわけではありません。

### 既存環境の棚卸し

| 項目 | 確認結果 |
|---|---|
| 確認日（日本時間） | 2026-10-26 |
| Worker名 | `kendo-support-counter` |
| ソースファイル | `counter/worker.js` |
| ソースを確認したGitコミットID | `300100096987e6a31e3e2b6851d15565df5017bc` |
| ソースの最終変更コミットID | `148bed82d13e44867eaf45c557e60c3afef3400d` |
| ソースファイルのSHA-256 | `5974f6593e3df3b0777f9760b008ab501c840e9c0ff08fb6df63e54041687e47` |
| デプロイ日（日本時間） | 正確な日時は未確認。既存READMEの設置日表記は2026-09-12。今回確認した画面表示は「1 month ago」 |
| デプロイ方法 | Cloudflare管理画面。DeploymentsのSourceが`Dashboard`であることを確認 |
| 稼働バージョン | 管理画面の短縮表示`32b199ae`、Active、トラフィック100%。完全なVersion IDとDeployment IDは未取得 |
| KV接続 | Binding名`COUNTER` → KV namespace `kendo-support-counter`を管理画面で確認 |
| 動作確認 | 2026-10-26 23:30頃（日本時間）、GETでHTTP 200と数値の`total`・`today`を確認。許可OriginのCORS応答・`no-store`も確認 |
| POST確認 | 本番の数を変えないため、加算するPOST試験は未実施 |
| 実稼働コードとの一致 | 管理画面でPOST処理周辺を目視確認。実稼働コード全体のバイト単位の取得・SHA-256照合は未完了。上記ハッシュはGitHubのソースのみを示す |

この棚卸しで本番のコード・KV・設定は変更していません。
Workerが保存するKVの値と、Cloudflareプラットフォーム側のログは別です。
今回の画面ではWorkers LogsがEnabledでした。「IP等を受け取らない」という上の既存説明は、
WorkerがIP等をカウンター用途で参照・KV保存していないこととして解釈してください。
プラットフォームのログ内容・保持設定まで非収集を確認した記録ではありません。

### 次回以降の記録テンプレート

本番デプロイの前に、内容・影響・テスト結果を管理者へ説明し、明示的な承認を得ます。
承認後、デプロイごとに以下を追記します。過去の記録は上書きしません。

```text
Worker名: kendo-support-counter
デプロイ日時（日本時間）: YYYY-MM-DD HH:MM JST
承認: 承認された変更・PR番号
対応するGitコミットID（40桁）:
ソースファイル: counter/worker.js
ソースのSHA-256:
デプロイ方法: Cloudflare Dashboard / その他（具体的に）
Cloudflare Version ID（完全な値）:
Cloudflare Deployment ID（取得可能な場合）:
トラフィック割合:
実稼働コードの取得元・照合結果: 一致 / 不一致 / 未確認（理由）
GET確認: HTTP状態、total/todayが数値であること
正常POST確認: 実施環境・内容・結果（未実施ならその理由）
拒否POST確認: 実施環境・内容・結果
画面確認: PC、スマートフォン、カウンター
以前の稼働Version ID（切り戻し先）:
未確認事項:
```

### 記録と照合の手順

1. GitHubで承認済みPRと、その変更を含むコミットの`counter/worker.js`を開く。
2. 手元で`git rev-parse HEAD`と`shasum -a 256 counter/worker.js`を実行し、コミットとファイルのSHA-256を控える。
3. Cloudflareの **Workers & Pages → kendo-support-counter → Deployments** で、現在のActiveバージョンを控える。
4. 明示的に承認された場合だけ **Edit code** で承認済みソースを反映し、**Deploy** する。Bindingsの`COUNTER`は変更しない。
5. Deploymentsで新しいActiveバージョン、正確な日時、トラフィック割合を確認して記録する。
6. **Edit code** がActiveバージョンを表示していることを確認し、Explorerの`worker.js`を右クリックして **Download…** から保存する。保存できなければ、照合は「未確認」とする。
7. 保存された実稼働ソースを別名で保管し、そのSHA-256と手順2のハッシュを比較する。ビルド・改行等で違う場合は差分を確認し、単純に一致と記録しない。
8. GETと画面表示を確認し、必要なPOST試験は承認された範囲で実施する。確認内容をこのREADMEに追記するPRを作る。

ロールバックは、CloudflareのDeploymentsで控えた以前のバージョンへ戻す操作です。
実行前に承認を得て、戻したVersion IDと日時を記録します。Workerの切り戻しはKVの値を戻しません。
