declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "npm:*" {
  export * from "@supabase/supabase-js";
}

declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined;
    }
    const env: Env;
    function serve(handler: (request: Request) => Promise<Response> | Response): void;
  }
}

export {};
