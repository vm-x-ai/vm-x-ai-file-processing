from collections.abc import Iterable


def chunk(iterable: list, size: int) -> Iterable[list]:
    """
    Chunk an iterable into a list of lists of a given size.
    """
    for i in range(0, len(iterable), size):
        yield iterable[i : i + size]
