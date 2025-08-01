from abc import ABC, abstractmethod
from typing import Any, Generic, Literal, TypeVar, Union, overload

from internal_db_services.database import Database
from internal_utils.chunk import chunk
from sqlalchemy import Column, insert, tuple_
from sqlalchemy.sql import ColumnExpressionArgument
from sqlmodel import SQLModel, delete, select, update

TModel = TypeVar("TModel", bound=SQLModel)
TReadModel = TypeVar("TReadModel", bound=SQLModel)
TCreateModel = TypeVar("TCreateModel", bound=SQLModel)
TID = TypeVar("TID", bound=Union[Any, tuple[Any, ...]])

MAX_PG_PARAM_SIZE = 65535


class BaseRepository(ABC, Generic[TID, TModel, TReadModel, TCreateModel]):
    """Base repository class providing common database operations.

    This abstract base class implements common CRUD operations for database models
    It uses SQLModel/SQLAlchemy for database operations and supports async operations.

    Args:
        session_factory: Callable that returns an async context manager for \
            read sessions
        write_session_factory: Callable that returns an async context manager \
            for write sessions
        model: The SQLModel class representing the database model
        read_model: The SQLModel class used for reading/returning data
        create_model: The SQLModel class used for creating new records

    Attributes:
        _session_factory: Factory for creating read database sessions
        _write_session_factory: Factory for creating write database sessions
        _model: The main database model class
        _read_model: The model class used for reading data
        _create_model: The model class used for creating records
    """

    def __init__(
        self,
        db: Database,
        model: type[TModel],
        read_model: type[TReadModel],
        create_model: type[TCreateModel],
    ):
        self._session_factory = db.session
        self._write_session_factory = db.writer_session
        self._model = model
        self._read_model = read_model
        self._create_model = create_model

    @property
    @abstractmethod
    def _id_fields(self) -> tuple[Column, ...]:
        """The ID field of the model."""
        ...

    @abstractmethod
    def _id_predicate(self, id: TID) -> ColumnExpressionArgument[bool]:
        """Creates a predicate for querying records by ID.

        Args:
            id: The ID value to query for

        Returns:
            A SQLAlchemy expression for filtering by the given ID
        """
        ...

    async def get_all(
        self,
        order_by: ColumnExpressionArgument | None = None,
        order_type: Literal["asc", "desc"] = "asc",
    ) -> list[TReadModel]:
        """Retrieves all records.

        Returns:
            List of all records converted to read model
        """
        async with self._session_factory() as session:
            query = select(self._model)
            if order_by:
                query = query.order_by(
                    order_by.asc() if order_type == "asc" else order_by.desc()
                )

            result = await session.scalars(query)
            return [self._read_model.model_validate(row) for row in result]

    async def get(self, id: TID) -> TReadModel | None:
        """Retrieves a single record by ID.

        Args:
            id: The ID of the record to retrieve

        Returns:
            The found record converted to read model, or None if not found
        """
        async with self._session_factory() as session:
            db_model = await session.get(self._model, id)
            if not db_model:
                return None

            return self._read_model.model_validate(db_model)

    async def get_many(self, ids: list[TID]) -> list[TReadModel]:
        """Retrieves multiple records by ID.

        Args:
            ids: List of IDs of the records to retrieve

        Returns:
            List of found records converted to read model
        """
        if not ids:
            return []

        async with self._session_factory() as session:
            query = select(self._model)
            if len(self._id_fields) > 1:
                query = query.where(tuple_(*self._id_fields).in_(ids))
            else:
                query = query.where(self._id_fields[0].in_(ids))

            result = await session.scalars(query)
            return [self._read_model.model_validate(row) for row in result]

    async def add(self, model: TCreateModel) -> TReadModel:
        """Adds a new record to the database.

        Args:
            model: The model instance to add

        Returns:
            The newly created record converted to read model

        Raises:
            SQLAlchemyError: If there is a database error
        """
        async with self._write_session_factory() as session:
            db_model = self._model.model_validate(model)
            session.add(db_model)
            await session.commit()
            await session.refresh(db_model)
            return self._read_model.model_validate(db_model)

    @overload
    async def add_all(
        self,
        models: list[TCreateModel],
        return_models: Literal[True],
    ) -> list[TReadModel]: ...

    @overload
    async def add_all(
        self,
        models: list[TCreateModel],
        return_models: Literal[False],
    ) -> None: ...

    @overload
    async def add_all(
        self,
        models: list[TCreateModel],
    ) -> None: ...

    async def add_all(
        self,
        models: list[TCreateModel],
        return_models: bool = False,
    ) -> list[TReadModel] | None:
        """Adds multiple records to the database.

        Args:
            models: List of model instances to add

        Raises:
            SQLAlchemyError: If there is a database error
        """
        async with self._write_session_factory() as session:
            db_models = [model.model_dump() for model in models]
            inserted_models = []

            for items in chunk(
                db_models, int(MAX_PG_PARAM_SIZE / len(self._model.model_fields.keys()))
            ):
                query = insert(self._model).values(items)
                if return_models:
                    query = query.returning(self._model)

                result = await session.execute(query)
                if return_models:
                    inserted_models.extend(
                        [
                            self._read_model.model_validate(row)
                            for row in result.scalars().all()
                        ]
                    )

            await session.commit()
            return inserted_models if return_models else None

    async def update(self, id: TID, values: dict[str, Any]) -> TReadModel:
        """Updates an existing record with new values.

        Args:
            id: The ID of the record to update
            values: Dictionary of field names and values to update

        Raises:
            SQLAlchemyError: If there is a database error
        """
        async with self._write_session_factory() as session:
            query = update(self._model).where(self._id_predicate(id)).values(**values)
            await session.execute(query)
            await session.commit()

            return await self.get(id)

    async def delete(self, id: TID) -> None:
        """Deletes a record from the database.

        Args:
            id: The ID of the record to delete

        Raises:
            SQLAlchemyError: If there is a database error
        """
        async with self._write_session_factory() as session:
            query = delete(self._model).where(self._id_predicate(id))
            await session.execute(query)
            await session.commit()
