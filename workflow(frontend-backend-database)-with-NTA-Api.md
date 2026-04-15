```mermaid
sequenceDiagram
    autonumber
    participant FE as Dashboard (Next.js)
    participant BE as adminBackend (FastAPI)
    participant DB as Database
    participant NTA as NTA API (External)


    FE->>BE: POST /refund_delete/dashboard/{id}
    BE->>DB: Fetch Refund & RefundRecord
    DB-->>BE: Return Refund Data


    BE->>NTA: Send Delete Request (JSON Payload)
    NTA-->>BE: Return Delete Response (JSON)


    BE->>DB: Update refund.status<br/>Save delete_request_body<br/>Save delete_response_body<br/>Save delete_send_no & deleted_at
    DB-->>BE: Commit Success


    BE-->>FE: 200 OK - Deletion Successful

```


```mermaid
flowchart LR
    %% ---------------------------
    %% Lanes (Swimlanes)
    %% ---------------------------
    subgraph L1["Frontend"]
        FE1(("1"))
        FE2(("9"))
    end

    subgraph L2["Backend"]
        BE1(("2"))
        BE2(("4"))
        BE3(("6"))
        BE4(("8"))
    end

    subgraph L3["Database"]
        DB1(("3"))
        DB2(("7"))
    end

    subgraph L4["NTA API"]
        NTA1(("5"))
    end

    %% ---------------------------
    %% Flow Connections
    %% ---------------------------
    FE1 -->|"Delete request"| BE1
    BE1 -->|"Fetch Refund + RefundRecord"| DB1
    DB1 -->|"Return refund data"| BE2
    BE2 -->|"Send delete payload"| NTA1
    NTA1 -->|"Return delete response"| BE3
    BE3 -->|"Update status + save delete data"| DB2
    DB2 -->|"Commit success"| BE4
    BE4 -->|"200 OK / refresh UI"| FE2

    %% ---------------------------
    %% Styling
    %% ---------------------------
    classDef frontend fill:#e6f4ff,stroke:#1d70b8,stroke-width:3px,color:#111;
    classDef backend fill:#e8fff0,stroke:#1f8f4e,stroke-width:3px,color:#111;
    classDef database fill:#f3e8ff,stroke:#7c3aed,stroke-width:3px,color:#111;
    classDef external fill:#fff4e5,stroke:#d97706,stroke-width:3px,color:#111;

    class FE1,FE2 frontend;
    class BE1,BE2,BE3,BE4 backend;
    class DB1,DB2 database;
    class NTA1 external;
```


### 削除処理のフロー

1. フロントエンドから `/refund_delete/dashboard/{id}` へ POST リクエストを送信。
2. バックエンドはデータベースから Refund と RefundRecord を取得。
3. 取得した情報を基に国税庁（NTA）APIへ削除リクエストを送信。
4. NTA API から削除レスポンスを受信。
5. バックエンドは以下の情報をデータベースへ保存：
   - refund.status
   - delete_request_body
   - delete_response_body
   - delete_send_no
   - deleted_at
6. データベースの保存完了後、バックエンドがフロントエンドへ成功レスポンスを返却。
