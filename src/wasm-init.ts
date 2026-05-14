import { wasmSourceMap } from '@stagas/wasm-sourcemap'

export interface InitOptions {
  binary: ArrayBuffer
  sourcemapUrl: string
  config: {
    options: {
      importMemory: boolean
      initialMemory: number
      maximumMemory: number
      sharedMemory: boolean
    }
  }
  imports?: WebAssembly.Imports | ((ctx: { memory: WebAssembly.Memory | undefined }) => WebAssembly.Imports)
}

export function liftString(memory: WebAssembly.Memory, pointer: number) {
  if (!pointer) return ''
  const end = (pointer + new Uint32Array(memory.buffer)[(pointer - 4) >>> 2]) >>> 1,
    memoryU16 = new Uint16Array(memory.buffer)
  let start = pointer >>> 1,
    string = ''
  while (end - start > 1024) {
    string += String.fromCharCode(...memoryU16.subarray(start, start += 1024))
  }
  return string + String.fromCharCode(...memoryU16.subarray(start, end))
}

export type WasmInit<T> = Awaited<ReturnType<typeof wasmInit<T>>>

export async function wasmInit<T>({ binary, sourcemapUrl, config, imports }: InitOptions) {
  const buffer = wasmSourceMap.setSourceMapURL(binary, sourcemapUrl)
  const uint8 = new Uint8Array(buffer)

  let memory = config.options.importMemory
    ? new WebAssembly.Memory({
      initial: config.options.initialMemory,
      maximum: config.options.maximumMemory,
      shared: config.options.sharedMemory,
    })
    : undefined
  const mod = await WebAssembly.compile(uint8.buffer)

  const extraImports = typeof imports === 'function' ? imports({ memory }) : imports
  const getMemory = () => {
    if (!memory) throw new Error('WebAssembly memory is not available')
    return memory
  }
  const importObject: WebAssembly.Imports = {
    env: {
      abort(message$: number, fileName$: number, lineNumber$: number, columnNumber$: number) {
        const memory = getMemory()
        const message = liftString(memory, message$ >>> 0)
        const fileName = liftString(memory, fileName$ >>> 0)
        const lineNumber = lineNumber$ >>> 0
        const columnNumber = columnNumber$ >>> 0
        throw new Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`)
      },
      seed: () => Date.now() * Math.random(),
      'console.log': (textPtr: number) => {
        console.log(liftString(getMemory(), textPtr))
      },
      'console.warn': (textPtr: number) => {
        console.warn(liftString(getMemory(), textPtr))
      },
    },
  }
  if (memory) importObject.env!.memory = memory

  if (extraImports) {
    for (const k of Object.keys(extraImports)) {
      const mod = (extraImports as any)[k]
      if (!mod) continue
      ;(importObject as any)[k] = { ...(importObject as any)[k], ...mod }
    }
  }

  const instance = await WebAssembly.instantiate(mod, importObject)
  memory ??= instance.exports.memory as WebAssembly.Memory
  if (!memory) throw new Error('WebAssembly memory is not available')

  const wasm: T = instance.exports as any

  return {
    wasm,
    memory,
  }
}
