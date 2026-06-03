company.py

```python
@router.get("/company-detail/{id}")
def read_own_company_detail(
    id: int, current_company: CurrentCompany, session: SessionDep
):
    db_company = session.get(Company, id)
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    decrypted_company = {
        "id": db_company.id,
        "biz_name": db_company.biz_name,
        "biz_name_kana": db_company.biz_name_kana,
        "biz_place": db_company.biz_place,
        "biz_place_kana": db_company.biz_place_kana,
        "manager_name": db_company.manager_name,
        "manager_name_kana": db_company.manager_name_kana,
        "manager_email": safe_decrypt(db_company.manager_email),
        "manager_phone": safe_decrypt(db_company.manager_phone),
        "sender_id": db_company.sender_id,
        "login_id": db_company.login_id,
        "login_password": db_company.login_password,
        "square_merchant_id": db_company.square_merchant_id,
        "square_connected_at": db_company.square_connected_at,
        "square_last_refreshed_at": db_company.square_last_refreshed_at,
    }
    return decrypted_company
```

square.py

```python
@router.get("/oauth/callback")
def square_oauth_callback(
    session: SessionDep,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
) -> RedirectResponse:
    if error:
        return RedirectResponse(
            url=f"{DASHBOARD_FRONTEND_URL}/account", status_code=302
        )

```

