# Firebase試験版 F1 の設定手順

既存の index.html（Ver.G9端末専用）は変更していません。

1. Firebase Console で新しいプロジェクトを作成し、Webアプリを登録。
2. Authentication > Sign-in method で Google を有効化。
3. Authentication > Settings > Authorized domains に kozoitcom.github.io を追加。
4. Firestore Database を作成し、firestore.rules の内容をルール画面に貼り付けて公開。
5. Firebase Console > プロジェクトの設定 > マイアプリ > Firebase SDK の設定値を firebase-config.js に入力。
6. https://kozoitcom.github.io/my-vocabulary-flashcards/firebase.html を開いてGoogleでログイン。
7. 端末Aでリストを登録し、端末Bでも同じGoogleアカウントでログイン。覚えた単語と学習位置を確認。

注意:
- Firebase設定を完了するまでは試験版は使用できません。
- FirebaseのWeb APIキーは秘密鍵ではありませんが、Firestoreルールと認証は必須です。
- G9の端末内のリスト・学習記録は自動移行しません。
- 学習進捗は単語ごとの保存・同期です。通信中やオフライン時の挙動は実機で検証が必要です。
- 同時に複数端末を操作する場合、最後に送信した学習位置が優先されます。
