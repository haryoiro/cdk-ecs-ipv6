# cdk


## 環境設定
異なる環境（開発、ステージング、本番など）に対して異なる値を設定するには、cdk.jsonファイルのcontextセクションを使用します。

## context の設定
cdk.jsonのcontextセクションに環境ごとの設定を追加します。
```json
{
  "context": {
    "prod": {
      "systemName": "server",
      "env": "prod",
      "region": "ap-northeast-1",
      "account": "111111111111",
      "certificateArn": "arn:aws:acm:ap-northeast-1:111111111111:certificate/00000000-0000-0000-0000-000000000000",
      "domain": "example.com"
    }
  }
}
```

[!IMPORTANT]
contextに新しい値を追加した場合は、lib/resource/abstract/resource.tsの型定義も更新してください。

## 環境の切り替え

デプロイ時に特定の環境を指定するには、cdkコマンドに--c env=<環境名>オプションを追加します。
本番環境にデプロイする場合

```sh
npm run deploy:prod
```

## SSL/TLS証明書について

証明書の検証プロセスには時間がかかる場合があるため、事前に証明書を作成し、その`ARN`を`cdk.json`の`context`セクションに追加してください。


[!CAUTION]
サブドメインを個別に登録すると、それらが公開されてしまう可能性があります。セキュリティを考慮し、可能な限りワイルドカード証明書を使用してください。


- 新しい環境変数や設定を追加する際は、必ず`cdk.json`の`context`セクションに追加し、対応する型定義を更新してください。
- 環境固有の値は常に`context`を通じて参照するようにし、ハードコーディングを避けてください。
- 証明書の`ARN`を更新する際は、対象の環境の`context`セクションのみを更新してください。
