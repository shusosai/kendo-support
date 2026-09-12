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
