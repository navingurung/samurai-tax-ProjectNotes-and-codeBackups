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
connection_status: str = Field(default="connected")
auto_sync_enabled: bool = Field(default=True)
disconnected_at: Optional[datetime] = Field(default=None)
deleted_at: Optional[datetime] = Field(default=None)
token_revoked_at: Optional[datetime] = Field(default=None)
```

- Make sure the import includes
```python
from datetime import datetime
from typing import Optional
```
