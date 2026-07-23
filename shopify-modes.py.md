```python

from typing import List, Optional

from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
from sqlalchemy import Column, JSON, BigInteger, TEXT, UniqueConstraint


# Sender Models
class Sender(SQLModel, table=True):
    __tablename__ = "senders"
    sender_id: str = Field(unique=True)
    sender_type: int
    id: int = Field(primary_key=True, default=None)
    companies: list["Company"] = Relationship(back_populates="sender")


# Company Models
class Company(SQLModel, table=True):
    __tablename__ = "companies"
    biz_name: str
    biz_name_kana: str = Field(default=None)
    biz_place: str
    biz_place_kana: str = Field(default=None)
    manager_name: str = Field(default=None)
    manager_name_kana: str = Field(default=None)
    manager_email: str = Field(default=None)
    manager_phone: str = Field(default=None)
    sender_id: int = Field(default=None, foreign_key="senders.id")
    id: int = Field(primary_key=True, default=None)
    login_id: str = Field(default=None, unique=True)
    login_password: str = Field(default=None)
    sender: Sender = Relationship(back_populates="companies")
    shops: list["Shop"] = Relationship(back_populates="company")
    shopify_stores: list["ShopifyStore"] = Relationship(back_populates="company")
    square_merchant_id: Optional[str] = Field(default=None, unique=True)
    square_access_token_encrypted: Optional[str] = Field(default=None)
    square_refresh_token_encrypted: Optional[str] = Field(default=None)
    square_token_expires_at: Optional[datetime] = Field(default=None)
    square_token_json_raw_encrypted: Optional[str] = Field(default=None)
    square_merchant_json_raw_encrypted: Optional[str] = Field(default=None)
    square_connected_at: Optional[datetime] = Field(default=None)
    square_last_refreshed_at: Optional[datetime] = Field(default=None)
    square_oauth_state: Optional[str] = Field(default=None)
    logo_id: Optional[str] = Field(default=None)
    # Smaregi integration fields
    smaregi_contract_id: Optional[str] = Field(default=None, unique=True)
    smaregi_access_token_encrypted: Optional[str] = Field(default=None)
    smaregi_token_expires_at: Optional[datetime] = Field(default=None)
    smaregi_connected_at: Optional[datetime] = Field(default=None)


# Shop Models
class Shop(SQLModel, table=True):
    __tablename__ = "shops"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "smaregi_store_id", name="uq_shop_company_smaregi_store"
        ),
    )

    id: int = Field(default=None, primary_key=True)
    shop_id: str = Field(unique=True)
    shop_type: int = Field(default=0)
    shop_name: str
    shop_name_kana: str = Field(default=None)
    shop_place: str
    shop_place_kana: str = Field(default=None)
    company_id: int = Field(default=0, foreign_key="companies.id")
    login_id: str = Field(default=None, unique=True)
    login_password: str = Field(default=None)
    contact_name: str = Field(default=None)
    contact_name_kana: str = Field(default=None)
    contact_email: str = Field(default=None)
    contact_phone: str = Field(default=None)
    shopify_location_id: Optional[str] = Field(default=None)
    use_shopify: bool = Field(default=False)
    shopify_store_id: Optional[int] = Field(
        default=None, foreign_key="shopify_stores.id"
    )
    product_list: List[str] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )
    use_trj: bool = Field(default=False, nullable=True)
    company: Company = Relationship(back_populates="shops")
    shopify_store: Optional["ShopifyStore"] = Relationship(back_populates="shops")
    square_location_id: Optional[str] = Field(default=None, unique=True)
    use_square: bool = Field(default=False)
    image_id: Optional[str] = Field(default=None, nullable=True)
    latitude: Optional[float] = Field(default=None, nullable=True)
    longitude: Optional[float] = Field(default=None, nullable=True)
    smaregi_store_id: Optional[str] = Field(default=None)
    use_smaregi: bool = Field(default=False)
    # SAM-184 store detail. max_length mirrors the migration's VARCHAR limits
    # so over-long input fails at validation (4xx), not at commit time.
    store_category: Optional[str] = Field(default=None, nullable=True, max_length=50)
    description: Optional[str] = Field(default=None, nullable=True, max_length=2000)
    website: Optional[str] = Field(default=None, nullable=True, max_length=512)
    public_phone: Optional[str] = Field(default=None, nullable=True, max_length=32)
    show_on_map: bool = Field(default=True, nullable=True)


class ShopifyStore(SQLModel, table=True):
    __tablename__ = "shopify_stores"
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: Optional[int] = Field(
        default=None, foreign_key="companies.id", index=True
    )
    shopify_shop_domain: str = Field(unique=True)
    shopify_access_token_encrypted: Optional[str] = Field(default=None)
    shopify_refresh_token_encrypted: Optional[str] = Field(default=None)
    scopes: Optional[str] = Field(default=None)
    access_token_expires_at: Optional[datetime] = Field(default=None)
    refresh_token_expires_at: Optional[datetime] = Field(default=None)
    connected_at: Optional[datetime] = Field(default=None)
    disconnected_at: Optional[datetime] = Field(default=None)
    company: Optional[Company] = Relationship(back_populates="shopify_stores")
    shops: list["Shop"] = Relationship(back_populates="shopify_store")


# SAM-184 — one row per (shop, weekday). AdminBackend rejects duplicate
# weekdays with 422 and uses delete-before-insert on replace; this UNIQUE
# is the DB-level guarantee both repos rely on.
class StoreHours(SQLModel, table=True):
    __tablename__ = "store_hours"
    __table_args__ = (
        UniqueConstraint("shop_id", "weekday", name="uq_store_hours_shop_weekday"),
    )
    id: Optional[int] = Field(default=None, primary_key=True)
    shop_id: int = Field(foreign_key="shops.id", index=True)
    weekday: int = Field(ge=0, le=6)
    # Only cap at max_length=5 (matches VARCHAR(5)) — no min so we never
    # fail reads of values written by other clients that don't enforce
    # the strict "HH:MM" format.
    open_time: Optional[str] = Field(default=None, max_length=5)
    close_time: Optional[str] = Field(default=None, max_length=5)
    is_closed: bool = Field(default=False)


# SAM-184 — ordered gallery of Cloudflare image IDs per shop.
class ShopImage(SQLModel, table=True):
    __tablename__ = "shop_images"
    id: Optional[int] = Field(default=None, primary_key=True)
    shop_id: int = Field(foreign_key="shops.id", index=True)
    image_id: str = Field(max_length=1024)
    sort_order: int = Field(default=0)


# OrdersBase Models
class Orders(SQLModel, table=True):
    __tablename__ = "orders"
    id: str = Field(primary_key=True)
    order_id: str
    created_at: datetime
    updated_at: datetime
    raw_payload: Optional[dict] = Field(
        sa_column=Column("raw_payload", JSON, nullable=True)
    )
    shop_id: Optional[int] = None
    access_code: str
    code_created_at: datetime
    code_used_at: Optional[datetime] = None
    status: Optional[str]


# RefundRecord
class RefundRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(
        default_factory=datetime.now, nullable=False, index=True
    )
    send_no: str = Field(index=True, nullable=False, unique=True)
    request_body: str = Field(
        sa_column=Column(
            "request_body",
            TEXT,
            nullable=False,
        )
    )
    response_body: str = Field(
        sa_column=Column(
            "response_body",
            TEXT,
            nullable=True,
        )
    )
    shop_id: int = Field(foreign_key="shops.id", nullable=False, index=True)
    order_id: str
    delete_request_body: Optional[str] = Field(
        sa_column=Column(
            "delete_request_body",
            TEXT,
            nullable=True,
        )
    )
    delete_response_body: Optional[str] = Field(
        sa_column=Column(
            "delete_response_body",
            TEXT,
            nullable=True,
        )
    )
    delete_send_no: Optional[str] = Field(default=None, nullable=True)
    deleted_at: Optional[datetime] = Field(default=None, nullable=True)


class Refund(SQLModel, table=True):
    __tablename__ = "refund"
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: str = Field(
        index=True, nullable=True, foreign_key="customers.customer_id"
    )
    name: str
    email: str
    nation: str
    birth_date: str
    passport_no: str
    land_status: str
    land_date: str
    order_id: str
    send_no: str
    status: str
    total_price: Optional[float] = Field(default=None, nullable=True)
    total_received: Optional[float] = Field(default=None, nullable=True)
    total_tax: float
    source_amount: float = Field(nullable=True, default=None)
    fee: float = Field(nullable=True, default=None)
    fee_tax: int = Field(nullable=True, default=None)
    fee_net: int = Field(nullable=True, default=None)
    sent_amount_jpy: Optional[float] = Field(default=None, nullable=True)
    sent_fee: Optional[float] = Field(default=None, nullable=True)
    sent_amount: float = Field(nullable=True, default=None)
    sent_at: Optional[datetime] = Field(nullable=True, default=None)
    created_at: datetime = Field(nullable=False)
    refund_record_id: Optional[int] = Field(
        foreign_key="refundrecord.id", nullable=False
    )
    target_currency: str
    target_account_id: str
    customer_transaction_id: Optional[str] = Field(default=None, nullable=True)
    transfer_id: Optional[str] = Field(default=None, nullable=True)
    shop_id: Optional[int] = Field(default=None, nullable=True, foreign_key="shops.id")
    verified_at: Optional[datetime] = Field(default=None, nullable=True)
    memo: Optional[str] = Field(default=None, nullable=True)
    residence_country: Optional[str] = Field(default=None, nullable=True)
    chinese_state: Optional[str] = Field(default=None, nullable=True)
    confirmed_at: Optional[datetime] = Field(default=None, nullable=True)
    commited_at: Optional[datetime] = Field(default=None, nullable=True)
    trj_tra_status: Optional[int] = Field(default=None, nullable=True)
    expired_at: Optional[datetime] = Field(default=None, nullable=True)


class Customer(SQLModel, table=True):
    __tablename__ = "customers"
    id: int = Field(default=None, primary_key=True)
    customer_id: str = Field(index=True, unique=True)
    name: str
    email: str
    phone: Optional[str] = Field(default=None)
    birth_date: str = Field(default=None)
    nation: str = Field(default=None)
    passport_no: str = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)
    password_hash: Optional[str] = Field(default=None, nullable=True)
    email_hash: Optional[str] = Field(default=None, nullable=True, index=True)
    first_name: Optional[str] = Field(default=None, nullable=True)
    last_name: Optional[str] = Field(default=None, nullable=True)
    passport_issued_country: Optional[str] = Field(default=None, nullable=True)
    passport_valid_until: Optional[str] = Field(default=None, nullable=True)
    gender: Optional[str] = Field(default=None, nullable=True)
    phone_country_code: Optional[str] = Field(default=None, nullable=True)
    trj_cus_status: Optional[int] = Field(default=None, nullable=True)


class CustomerInvite(SQLModel, table=True):
    __tablename__ = "customer_invites"

    id: Optional[int] = Field(default=None, primary_key=True)
    refund_id: int = Field(foreign_key="refund.id", nullable=False, index=True)
    token: str = Field(nullable=False, unique=True, index=True)
    email_hash: str = Field(nullable=False, index=True)
    created_at: datetime = Field(
        default_factory=datetime.now, nullable=False, index=True
    )
    expires_at: datetime = Field(nullable=False, index=True)
    used_at: Optional[datetime] = Field(default=None, nullable=True, index=True)
    used_by_customer_id: Optional[int] = Field(
        default=None, nullable=True, foreign_key="customers.id", index=True
    )
    attempts: int = Field(default=0, nullable=False)
    locked_until: Optional[datetime] = Field(default=None, nullable=True, index=True)
    # Pin to TEXT to match the migration and stop alembic autogen drift.
    refund_claim_code_hash: Optional[str] = Field(
        default=None, sa_column=Column(TEXT, nullable=True)
    )


class CustomerLoginCode(SQLModel, table=True):
    __tablename__ = "customer_login_codes"

    id: Optional[int] = Field(default=None, primary_key=True)
    email_hash: str = Field(nullable=False, index=True)
    code_hash: str = Field(nullable=False)
    created_at: datetime = Field(
        default_factory=datetime.now, nullable=False, index=True
    )
    expires_at: datetime = Field(nullable=False, index=True)
    consumed_at: Optional[datetime] = Field(default=None, nullable=True, index=True)
    attempts: int = Field(default=0, nullable=False)
    locked_until: Optional[datetime] = Field(default=None, nullable=True, index=True)


class AdminUser(SQLModel, table=True):
    __tablename__ = "admin_users"
    id: int = Field(default=None, primary_key=True)
    login_id: str = Field(default=None, unique=True)
    login_password: str = Field(default=None)
    name: str
    name_kana: str = Field(default=None)
    email: str
    role: str = Field(default=None)


class Session(SQLModel, table=True):
    __tablename__ = "Session"
    id: str = Field(primary_key=True)
    shop: str
    state: str
    isOnline: bool = Field(default=False)
    scope: Optional[str] = None
    expires: Optional[datetime] = None
    accessToken: str
    userId: Optional[int] = Field(default=None, sa_column=Column(BigInteger))
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    accountOwner: bool = Field(default=False)
    locale: Optional[str] = None
    collaborator: Optional[bool] = Field(default=False)
    emailVerified: Optional[bool] = Field(default=False)


class EmailVerification(SQLModel, table=True):
    __tablename__ = "email_verifications"
    id: Optional[int] = Field(default=None, primary_key=True)  # PK
    email: str  # 認証対象メールアドレス（暗号化）
    code: str  # 6桁認証コード（ハッシュ化）
    shop_id: int  # どの店舗からのリクエストか
    order_id: str  # 紐づく注文ID
    # Store native datetime values so the router can pass timestamps directly.
    created_at: datetime = Field(default_factory=datetime.now)  # 発行日時
    expires_at: datetime  # 有効期限（例: 10分後）
    verified_at: Optional[datetime] = Field(
        default=None, nullable=True
    )  # 認証完了日時（NULL = 未認証）
    attempts: int = Field(default=0)  # 試行回数（ブルートフォース対策）


class RemittanceHistory(SQLModel, table=True):
    __tablename__ = "remittance_history"
    id: int = Field(primary_key=True, index=True)
    target_period_from: datetime
    target_period_to: datetime
    organization_id: int = Field(foreign_key="companies.id", nullable=False, index=True)
    raw_response: str = Field(
        sa_column=Column(
            "raw_response",
            JSON,
            nullable=False,
        )
    )
    fund_amount: int
    due_total: int
    refund_ids: List[int] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )
    pdf_path: Optional[str] = Field(default=None, nullable=True)
    status: str
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.now,
        sa_column_kwargs={"onupdate": datetime.now},
    )


class PDFRequest(SQLModel, table=True):
    __tablename__ = "pdf_requests"
    id: int = Field(primary_key=True)
    company_name: str
    division: str = Field(default=None)
    first_name: str
    last_name: str
    email: str
    message: Optional[str] = Field(default=None)
    phone: str
    when: str
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)

```
