models.py → create empty migration file  → push on git → review → merge → migration code start
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

## Note: Dont use --autogenerate, if then the results below will happen. If used already then it is Okay to delete with 
```bash
rm alembic/versions/0e8e3550cbdc_add_shopify_stores_table.py
```
- rm with file name.

### Result:

```bash
((venv) ) ➜  taimatsu-tax-free-backend git:(staging) ✗ alembic revision --autogenerate -m "add shopify_stores table"
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.autogenerate.compare] Detected added table 'shopify_stores'
INFO  [alembic.autogenerate.compare] Detected added index 'ix_shopify_stores_company_id' on '('company_id',)'
INFO  [alembic.ddl.postgresql] Detected sequence named 'refresh_tokens_id_seq' as owned by integer column 'refresh_tokens(id)', assuming SERIAL and omitting
INFO  [alembic.autogenerate.compare] Detected removed index 'ix_refresh_tokens_token_hash' on 'refresh_tokens'
INFO  [alembic.autogenerate.compare] Detected removed index 'ix_refresh_tokens_user_id' on 'refresh_tokens'
INFO  [alembic.autogenerate.compare] Detected removed table 'refresh_tokens'
INFO  [alembic.ddl.postgresql] Detected sequence named 'customer_invites_id_seq' as owned by integer column 'customer_invites(id)', assuming SERIAL and omitting
INFO  [alembic.ddl.postgresql] Detected sequence named 'shop_images_id_seq' as owned by integer column 'shop_images(id)', assuming SERIAL and omitting
INFO  [alembic.ddl.postgresql] Detected sequence named 'admin_users_id_seq' as owned by integer column 'admin_users(id)', assuming SERIAL and omitting
INFO  [alembic.ddl.postgresql] Detected sequence named 'pdf_requests_id_seq' as owned by integer column 'pdf_requests(id)', assuming SERIAL and omitting
INFO  [alembic.ddl.postgresql] Detected sequence named 'customer_login_codes_id_seq' as owned by integer column 'customer_login_codes(id)', assuming SERIAL and omitting
INFO  [alembic.ddl.postgresql] Detected sequence named 'remittance_history_id_seq' as owned by integer column 'remittance_history(id)', assuming SERIAL and omitting
INFO  [alembic.ddl.postgresql] Detected sequence named 'email_verifications_id_seq' as owned by integer column 'email_verifications(id)', assuming SERIAL and omitting
INFO  [alembic.ddl.postgresql] Detected sequence named 'store_hours_id_seq' as owned by integer column 'store_hours(id)', assuming SERIAL and omitting
INFO  [alembic.autogenerate.compare] Detected NOT NULL on column 'companies.login_id'
INFO  [alembic.autogenerate.compare] Detected NOT NULL on column 'companies.login_password'
INFO  [alembic.autogenerate.compare] Detected type change from TEXT() to AutoString() on 'companies.logo_id'
INFO  [alembic.autogenerate.compare] Detected type change from TEXT() to AutoString() on 'companies.smaregi_access_token_encrypted'
INFO  [alembic.autogenerate.compare] Detected added unique constraint None on '('login_id',)'
INFO  [alembic.autogenerate.compare] Detected added unique constraint None on '('smaregi_contract_id',)'
INFO  [alembic.autogenerate.compare] Detected NOT NULL on column 'customers.birth_date'
INFO  [alembic.autogenerate.compare] Detected NOT NULL on column 'customers.nation'
INFO  [alembic.autogenerate.compare] Detected NOT NULL on column 'customers.passport_no'
INFO  [alembic.autogenerate.compare] Detected NULL on column 'customers.email_hash'
INFO  [alembic.autogenerate.compare] Detected removed unique constraint 'customers_customer_id_key' on 'customers'
INFO  [alembic.autogenerate.compare] Detected changed index 'ix_customers_customer_id' on 'customers': unique=False to unique=True
INFO  [alembic.autogenerate.compare] Detected NOT NULL on column 'pdf_requests.division'
INFO  [alembic.autogenerate.compare] Detected type change from TEXT() to AutoString() on 'pdf_requests.message'
INFO  [alembic.autogenerate.compare] Detected NOT NULL on column 'pdf_requests.phone'
INFO  [alembic.autogenerate.compare] Detected NOT NULL on column 'pdf_requests.when'
INFO  [alembic.autogenerate.compare] Detected removed index 'ix_pdf_requests_created_at' on 'pdf_requests'
INFO  [alembic.autogenerate.compare] Detected type change from TEXT() to AutoString() on 'refund.memo'
INFO  [alembic.autogenerate.compare] Detected removed index 'ix_refund_claim_code' on 'refund'
INFO  [alembic.autogenerate.compare] Detected removed column 'refund.claim_code'
INFO  [alembic.autogenerate.compare] Detected added index 'ix_remittance_history_id' on '('id',)'
INFO  [alembic.autogenerate.compare] Detected removed foreign key (organization_id)(id) on table remittance_history
INFO  [alembic.autogenerate.compare] Detected added foreign key (organization_id)(id) on table remittance_history
INFO  [alembic.autogenerate.compare] Detected removed foreign key (shop_id)(id) on table shop_images
INFO  [alembic.autogenerate.compare] Detected added foreign key (shop_id)(id) on table shop_images
INFO  [alembic.autogenerate.compare] Detected added column 'shops.shopify_store_id'
INFO  [alembic.autogenerate.compare] Detected NULL on column 'shops.shopify_location_id'
INFO  [alembic.autogenerate.compare] Detected type change from TEXT() to AutoString() on 'shops.image_id'
INFO  [alembic.autogenerate.compare] Detected added unique constraint 'uq_shop_company_smaregi_store' on '('company_id', 'smaregi_store_id')'
INFO  [alembic.autogenerate.compare] Detected added foreign key (shopify_store_id)(id) on table shops
INFO  [alembic.autogenerate.compare] Detected removed foreign key (shop_id)(id) on table store_hours
INFO  [alembic.autogenerate.compare] Detected added foreign key (shop_id)(id) on table store_hours

 Generating /Users/taimatsu/Documents/STORE/taimatsu-tax-free-backend/alembic/versions/0e8e3550cbdc_add_shopify_stores_table.py ...  done
```

### Create empty migration without `--autogenerate`

```bash
// Example
((venv) ) ➜  taimatsu-tax-free-backend git:(staging) ✗ alembic revision -m "add shopify_stores table"
  Generating /Users/taimatsu/Documents/STORE/taimatsu-tax-free-backend/alembic/versions/bb9482d4a403_add_shopify_stores_table.py ...  done
```


