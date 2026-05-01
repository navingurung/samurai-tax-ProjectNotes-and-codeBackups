Step1, Add column on DB(square_connections table)
```sql
ALTER TABLE square_connections
ADD COLUMN IF NOT EXISTS connection_status VARCHAR DEFAULT 'connected' NOT NULL;

ALTER TABLE square_connections
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT TRUE NOT NULL;

ALTER TABLE square_connections
ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE square_connections
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE square_connections
ADD COLUMN IF NOT EXISTS token_revoked_at TIMESTAMP WITH TIME ZONE;

```

To confirm

```sql
SELECT
  id,
  merchant_id,
  connection_status,
  auto_sync_enabled,
  disconnected_at,
  deleted_at,
  token_revoked_at
FROM square_connections
ORDER BY id;
```


Expected: 
```bash
connection_status = connected
auto_sync_enabled = true
disconnected_at = null
deleted_at = null
token_revoked_at = null
```


Step 2: update the backend model only.

on `app/models/sqare_connection.py`

on Class SquareConnection

add

```python
    connection_status: str = Field(
        default="connected",
        sa_column=Column(String, nullable=False),
    )
    auto_sync_enabled: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False),
    )
    disconnected_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    token_revoked_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
```

- Make sure the import includes
```python
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, Column, DateTime, JSON, String, Text
```


Expected: 
```python
class SquareConnection(SQLModel, table=True):
    __tablename__ = "square_connections"

    id: Optional[int] = Field(default=None, primary_key=True)

    merchant_id: str = Field(
        sa_column=Column(String, unique=True, index=True, nullable=False)
    )

    merchant_name: Optional[str] = Field(default=None, sa_column=Column(String))
    country: Optional[str] = Field(default=None, sa_column=Column(String))
    language_code: Optional[str] = Field(default=None, sa_column=Column(String))
    status: Optional[str] = Field(default=None, sa_column=Column(String))

    environment: str = Field(default="sandbox", sa_column=Column(String, nullable=False))

    access_token: str = Field(sa_column=Column(Text, nullable=False))
    refresh_token: Optional[str] = Field(default=None, sa_column=Column(Text))
    token_type: Optional[str] = Field(default=None, sa_column=Column(String))
    scope: Optional[str] = Field(default=None, sa_column=Column(Text))
    expires_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    raw_token_json: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    raw_merchant_json: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )

    connected_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    ## HERE
       connection_status: str = Field(
        default="connected",
        sa_column=Column(String, nullable=False),
    )
    auto_sync_enabled: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False),
    )
    disconnected_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    token_revoked_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
```

- Then Restart The DOCKER Backend.
```docker
docker compose restart backend
```
