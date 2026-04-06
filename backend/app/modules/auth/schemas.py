from pydantic import BaseModel


class TelegramLoginRequest(BaseModel):
    init_data_raw: str