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




```mermaid
flowchart LR
    FE["1. Frontend"] --> BE1["2. Backend"]
    BE1 --> DB1["3. DB Read"]
    DB1 --> BE2["4. Backend"]
    BE2 --> NTA["5. NTA API Response"]
    NTA --> BE3["6. Backend Processing (resp.json())"]
    BE3 -->|❌ Error| ERR["500 Internal Server Error"]
    BE3 -->|✅ Success| DB2["7. DB Save"]
    DB2 --> BE4["8. Backend Response"]
    BE4 --> FE2["9. Frontend Update"]

    classDef error fill:#ffe5e5,stroke:#d32f2f,stroke-width:2px;
    class ERR error;

```

```python
 try:
    refund.status = "cancelled"
    session.add(refund)
    
    refund_record.delete_request_body = encrypt(request_body)
    #  国税庁（NTA）APIのレスポンスが空または非JSONの場合に
    # resp.json() でパースエラーが発生するため、
    # 安全にJSON形式へ変換してから暗号化し、DBへ保存する。
    # The error occurs because the backend assumes the NTA API response is always valid JSON.
    # When the response is empty or not JSON, resp.json() fails, leading to a 500 Internal Server Error.


　　# 原因：
　　# レスポンスが空またはJSON形式でない場合、resp.json() が失敗し、
　　# encrypt(resp.json()) の処理で500エラーが発生する。
    refund_record.delete_response_body = encrypt(resp.json())

    refund_record.delete_send_no = newSendNo
    refund_record.deleted_at = datetime.now()
    session.add(refund_record)
    session.commit()
    session.refresh(refund_record)
    session.refresh(refund)
    
  except Exception as e:
    session.rollback()
    raise HTTPException(status_code=500, detail=f"Error saving delete refund to DB: {str(e)}")

```

<img width="1894" height="795" alt="Screenshot 2026-04-15 at 8 36 11" src="https://github.com/user-attachments/assets/6d3e8b02-2a8c-4b12-b29f-f3731e618a32" />



<img width="798" height="422" alt="Screenshot 2026-04-15 at 9 50 09" src="https://github.com/user-attachments/assets/c6a7e339-e3b5-460b-b5b8-0365ff1a2a35" />


<img width="792" height="186" alt="Screenshot 2026-04-15 at 9 50 24" src="https://github.com/user-attachments/assets/4553fa3d-c6d4-46e9-99a9-a05c684ab7f9" />




