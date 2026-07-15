### 1. Update models.py

### 2. Before generating, confirm you're on the latest head:
```bash
alembic current
```

### Results:
```bash
((venv) ) ➜  taimatsu-tax-free-backend git:(staging) ✗ alembic current
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
a9d4f1c7b8e2 (head)
```

### 2. create a new migration file.
```bash
alembic revision --autogenerate -m "add shopify_stores table"

revision → make a new migration
--autogenerate → fill it by diffing models.py against the DB
-m → the name
```
