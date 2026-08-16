import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

interface Filter {
  column: string;
  op: string;
  value: unknown;
}

interface RequestBody {
  table?: string;
  action: string;
  columns?: string;
  order?: string;
  filters?: Filter[];
  data?: Record<string, unknown>;
  bucket?: string;
  filename?: string;
  contentType?: string;
  fileData?: string;
  path?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action } = body;

    // --- Storage operations ---
    if (action === "upload") {
      const fileBytes = Uint8Array.from(atob(body.fileData!), (c) => c.charCodeAt(0));
      const { data, error } = await supabase.storage
        .from(body.bucket!)
        .upload(body.filename!, fileBytes, {
          contentType: body.contentType!,
          upsert: false,
        });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: urlData } = supabase.storage.from(body.bucket!).getPublicUrl(data.path);
      return new Response(JSON.stringify({ data: { path: data.path, publicUrl: urlData.publicUrl } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Table CRUD ---
    const { table, columns, order, filters, data } = body;
    let query = supabase.from(table!);

    if (action === "select") {
      let q = query.select(columns || "*");
      if (order) q = q.order(order);
      if (filters) {
        for (const f of filters) {
          if (f.op === "eq") q = q.eq(f.column, f.value);
          else if (f.op === "neq") q = q.neq(f.column, f.value);
        }
      }
      const { data: result, error } = await q;
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "insert") {
      const insertData = Array.isArray(data) ? data : [data];
      const { data: result, error } = await query.insert(insertData).select();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      let q = query.update(data);
      if (filters) {
        for (const f of filters) {
          if (f.op === "eq") q = q.eq(f.column, f.value);
        }
      }
      const { data: result, error } = await q.select();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      let q = query.delete();
      if (filters) {
        for (const f of filters) {
          if (f.op === "eq") q = q.eq(f.column, f.value);
        }
      }
      const { error } = await q;
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
