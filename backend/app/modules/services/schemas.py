from pydantic import BaseModel, ConfigDict


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    price: int
    duration_min: int