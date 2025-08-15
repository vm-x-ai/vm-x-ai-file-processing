from dependency_injector import providers
from internal_db_repositories.containers import RepositoriesContainer
from internal_services.containers import ServicesContainer

from api.settings import Settings


class Container(RepositoriesContainer, ServicesContainer):
    settings = providers.Singleton(Settings)
