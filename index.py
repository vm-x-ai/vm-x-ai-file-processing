from uuid import UUID

from pydantic import BaseModel
import inspect

class MyModel(BaseModel):
    project_id: UUID

class Test:
    def run(self, file_id: UUID, model: MyModel):
        return {
            "file_id": type(file_id),
            "model": type(model),
        }
    
instance = Test()
result = instance.run(
    UUID("123e4567-e89b-12d3-a456-426614174000"),
    MyModel(project_id=UUID("123e4567-e89b-12d3-a456-426614174000")),
)

print(result)

raw_args = {
    "file_id": "123e4567-e89b-12d3-a456-426614174000",
    "model": {
        "project_id": "123e4567-e89b-12d3-a456-426614174000",
    }
}

parsed_args = {}
for param_name, param_type in inspect.signature(instance.run).parameters.items():
    if param_name not in raw_args:
        raise ValueError(f"Missing argument: {param_name}")

    if issubclass(param_type.annotation, BaseModel):
        parsed_args[param_name] = param_type.annotation.model_validate(raw_args[param_name])
    else:
        parsed_args[param_name] = param_type.annotation(raw_args[param_name])

print(parsed_args)
