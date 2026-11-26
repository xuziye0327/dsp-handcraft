declare module 'pako' {
  export function gzip(input: Uint8Array | ArrayBuffer | string): Uint8Array<ArrayBuffer>
  export function ungzip(input: Uint8Array | ArrayBuffer): Uint8Array<ArrayBuffer>
}
