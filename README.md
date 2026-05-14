# @stagas/wasm-init

Initialize AssemblyScript WebAssembly modules with sourcemap metadata, standard host imports, and optional imported memory.

## Install

```sh
npm install @stagas/wasm-init
```

## Usage

```ts
import { wasmInit } from '@stagas/wasm-init'

interface Exports {
  add(a: number, b: number): number
}

const binary = await fetch('/module.wasm').then(res => res.arrayBuffer())

const { wasm, memory } = await wasmInit<Exports>({
  binary,
  sourcemapUrl: '/module.wasm.map',
  config: {
    options: {
      importMemory: true,
      initialMemory: 1,
      maximumMemory: 16,
      sharedMemory: false,
    },
  },
})

console.log(wasm.add(1, 2))
console.log(memory.buffer.byteLength)
```

## Memory

When `config.options.importMemory` is `true`, `wasmInit` creates a `WebAssembly.Memory` from `initialMemory`, `maximumMemory`, and `sharedMemory`, then passes it as `env.memory`.

When `config.options.importMemory` is `false`, `wasmInit` does not create or import memory. The module must export a memory named `memory`, and that exported memory is returned.

```ts
const { memory } = await wasmInit({
  binary,
  sourcemapUrl: '/module.wasm.map',
  config: {
    options: {
      importMemory: false,
      initialMemory: 1,
      maximumMemory: 1,
      sharedMemory: false,
    },
  },
})
```

## Imports

Pass extra imports as an object:

```ts
await wasmInit({
  binary,
  sourcemapUrl: '/module.wasm.map',
  config,
  imports: {
    env: {
      now: Date.now,
    },
  },
})
```

Or pass a function when imports need access to the created memory:

```ts
await wasmInit({
  binary,
  sourcemapUrl: '/module.wasm.map',
  config,
  imports: ({ memory }) => ({
    env: {
      read(ptr: number) {
        if (!memory) throw new Error('Memory is exported by the module')
        return new Uint8Array(memory.buffer)[ptr]
      },
    },
  }),
})
```

The callback receives `memory` as `undefined` when `importMemory` is `false`.

## Standard Imports

`wasmInit` provides these `env` imports:

- `abort(message, fileName, lineNumber, columnNumber)`
- `seed()`
- `console.log(textPtr)`
- `console.warn(textPtr)`

Extra imports are merged over the defaults.

## API

```ts
wasmInit<T>(options): Promise<{
  wasm: T
  memory: WebAssembly.Memory
}>
```

```ts
liftString(memory: WebAssembly.Memory, pointer: number): string
```

## License

MIT
