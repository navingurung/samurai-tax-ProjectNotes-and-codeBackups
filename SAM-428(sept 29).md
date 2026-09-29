```python

def _build_v3_cancel_body(request_body: dict) -> dict:
    """v3 の取消は元レコードを反転せず、beforeSendNo 等でポインタとして送る。

    金額・数量は反転しない。details は空でよい（別紙1-3 項番37）。
    """
    sender_id = request_body.get("senderId")
    shop_id = request_body.get("shopId")
    send_no = request_body.get("sendNo")

    if not sender_id or not shop_id or not send_no:
        raise HTTPException(
            status_code=500,
            detail="Cannot build a v3 cancel: the original record is missing senderId, shopId, or sendNo.",
        )

    body = dict(request_body)  # 元の dict を書き換えない
    body["crudType"] = "9"
    body["beforeSendNo"] = send_no
    body["beforeSenderId"] = sender_id
    body["beforeShopId"] = shop_id
    body["details"] = []

    return body







    if nta_version == "v2":
        # v2: マイナス伝票。元の details を反転してそのまま送る。sendNo は 002 で紐付ける。
        general_total = 0
        if "details" in request_body and isinstance(request_body["details"], list):
            for detail in request_body["details"]:
                if "price" in detail and isinstance(detail["price"], (int, float)):
                    detail["price"] = -abs(detail["price"])
                    general_total += detail["price"]
                if "number" in detail and isinstance(detail["number"], (int, float)):
                    detail["number"] = -abs(detail["number"])

        sendNo = request_body.get("sendNo", "")
        newSendNo = sendNo[:-3] + "002"
        request_body["sendNo"] = newSendNo
        request_body["generalTotal"] = str(general_total)
    else:
        # v3: 反転せず、beforeSendNo 等でポインタとして送る。
        request_body = _build_v3_cancel_body(request_body)
        newSendNo = request_body[
            "sendNo"
        ]  # SAM-428 が新しい採番に置き換えるまでは元の値のまま

```
```python
# test_routers_refund.py

from fastapi import HTTPException

from AdminApp.routers.refund import _build_v3_cancel_body


def _request_body(**extra):
    return {
        "sendNo": "S0000000001001",
        "senderId": "sender-1", #added
        "shopId": "shop-1", #added
        "generalTotal": "1000",
        "details": [{"price": 1000, "number": 1}],
        **extra,
    }




class TestBuildV3CancelBody:
    """_build_v3_cancel_body() 単体のテスト。DB・HTTPは不要。"""

    ORIGINAL = {
        "sendNo": "20260901123045001",
        "senderId": "sender-1",
        "shopId": "shop-1",
        "generalTotal": "1000",
        "details": [{"price": 1000, "number": 1}],
    }

    def test_sets_crud_type_to_9(self):
        body = _build_v3_cancel_body(dict(self.ORIGINAL))
        assert body["crudType"] == "9"

    def test_sets_the_three_before_fields_from_the_original(self):
        body = _build_v3_cancel_body(dict(self.ORIGINAL))
        assert body["beforeSendNo"] == "20260901123045001"
        assert body["beforeSenderId"] == "sender-1"
        assert body["beforeShopId"] == "shop-1"

    def test_details_is_empty(self):
        body = _build_v3_cancel_body(dict(self.ORIGINAL))
        assert body["details"] == []

    def test_does_not_reverse_amounts_or_counts(self):
        # v2 は price/number を反転するが、v3 はしない。generalTotal もそのまま。
        body = _build_v3_cancel_body(dict(self.ORIGINAL))
        assert body["generalTotal"] == "1000"

    def test_does_not_mutate_the_original_dict(self):
        original = dict(self.ORIGINAL)
        _build_v3_cancel_body(original)
        assert original == self.ORIGINAL

    @pytest.mark.parametrize("missing_key", ["sendNo", "senderId", "shopId"])
    def test_stops_with_500_when_a_required_field_is_missing(self, missing_key):
        body = dict(self.ORIGINAL)
        del body[missing_key]
        with pytest.raises(HTTPException) as exc_info:
            _build_v3_cancel_body(body)
        assert exc_info.value.status_code == 500



```

