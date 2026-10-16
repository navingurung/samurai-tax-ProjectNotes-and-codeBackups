```sql
SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;

-- SAM-653 pre-deploy check (read-only).
-- Lists existing shops / companies whose NTA fields would fail the new admin check.
WITH fields AS (
    SELECT 'shop' AS kind, id, 'shop_name' AS field, shop_name AS value, 70 AS max_chars FROM shops
    UNION ALL
    SELECT 'shop', id, 'shop_place', shop_place, 70 FROM shops
    UNION ALL
    SELECT 'company', id, 'biz_name', biz_name, 50 FROM companies
    UNION ALL
    SELECT 'company', id, 'biz_place', biz_place, 50 FROM companies
),
trimmed AS (
    SELECT *,
           -- same whitespace set as Python str.strip()
           regexp_replace(
               value,
               '^[\t\n\x0b\x0c\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+'
               '|[\t\n\x0b\x0c\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$',
               '', 'g'
           ) AS v
    FROM fields
),
checked AS (
    SELECT kind, id, field, value,
           CASE
               WHEN v IS NULL OR v = '' THEN 'blank'
               WHEN char_length(v) > max_chars THEN 'over ' || max_chars || ' characters'
               WHEN octet_length(v) > max_chars * 3 THEN 'over ' || max_chars * 3 || ' bytes'
               WHEN strpos(v, '"') > 0 THEN 'contains "'
               WHEN v ~ ('[^\u0020-\u007E\u00A0-\u00FF\u0370-\u03FF\u0400-\u04FF'
                         '\u2000-\u206F\u2150-\u218F\u2190-\u21FF\u2200-\u22FF'
                         '\u2460-\u24FF\u2500-\u257F\u25A0-\u25FF'
                         '\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u3200-\u32FF\u3300-\u33FF'
                         '\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFF65\uFFA0-\uFFEF]')
                   THEN 'character not allowed by NTA'
           END AS reason
    FROM trimmed
)
SELECT kind, id, field, reason, value
FROM checked
WHERE reason IS NOT NULL
ORDER BY kind, id, field;

```
