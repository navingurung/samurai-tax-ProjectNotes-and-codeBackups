## Summary
Adds the `shopify_stores` table and links it to `shops`, per TAI-558.

Three-table model: `companies` → `shopify_stores` → `shops`

## Why token on shopify_stores
A Shopify access token is scoped to one installed shop, and one company can
install on multiple Shopify stores — so the token can't live on `companies`
like Square/Smaregi.

## Changes
**models.py**
- New `ShopifyStore` model
- `Shop.shopify_store_id` FK (nullable)
- `shops.shopify_location_id` → `Optional[str]` (was NOT NULL — Square/Smaregi
  shops have no Shopify location)
- Relationships: `Company.shopify_stores`, `ShopifyStore.company/shops`,
  `Shop.shopify_store`

**Migration** `bb9482d4a403`
- Hand-written. `--autogenerate` detected ~30 unrelated pre-existing drifts
  (including dropping `refresh_tokens`), so only the intended ops are included.

## Notes
- `company_id` is nullable — NULL until provisioning links the store to a company
- Migration not yet run

## Related
TAI-558
