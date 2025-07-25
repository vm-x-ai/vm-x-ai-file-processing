

import asyncio


class Target:
    async def greet(self, name):
        return f"Hello, {name}!"

    async def add(self, x, y):
        return x + y


class AsyncProxy:
    def __init__(self, get_delegate_async):
        self._get_delegate_async = get_delegate_async

    def __getattr__(self, name):
        async def method_proxy(*args, **kwargs):
            delegate = await self._get_delegate_async()
            attr = getattr(delegate, name)
            if not callable(attr):
                return attr
            return await attr(*args, **kwargs)

        return method_proxy


async def resolve_delegate():
    await asyncio.sleep(0.1)  # simulate I/O
    return Target()

async def main():
    proxy = AsyncProxy(resolve_delegate)

    result1 = await proxy.greet("Lucas")
    print(result1)

    result2 = await proxy.add(2, 3)
    print(result2)

    print(proxy._get_delegate_async)

asyncio.run(main())