// deno-shim.d.ts - Deno type declarations for Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
