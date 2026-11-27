import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !serviceKey || !token) return reply(401, { error: "unauthorized" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return reply(401, { error: "unauthorized" });

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return reply(400, { error: "invalid_json" }); }
  const action = input.action;
  const businessId = input.businessId;
  if (typeof action !== "string") return reply(400, { error: "invalid_request" });

  if (action === "businesses") {
    const { data: memberships, error } = await admin.from("business_members").select("business_id").eq("user_id", auth.user.id);
    if (error) return reply(503, { error: "membership_unavailable" });
    const ids = [...new Set((memberships ?? []).map((x: { business_id: string }) => x.business_id))];
    if (!ids.length) return reply(200, { businesses: [] });
    const { data, error: businessError } = await admin.from("businesses").select("id,name").in("id", ids);
    if (businessError) return reply(503, { error: "businesses_unavailable" });
    return reply(200, { businesses: (data ?? []).filter((x: { id: string }) => ids.includes(x.id)) });
  }

  if (typeof businessId !== "string" || !/^[0-9a-f-]{36}$/i.test(businessId)) return reply(400, { error: "invalid_business" });
  const { data: member } = await admin.from("business_members").select("business_id,role").eq("business_id", businessId).eq("user_id", auth.user.id).maybeSingle();
  if (!member) return reply(403, { error: "forbidden" });
  if (["approve", "schedule"].includes(String(action)) && !["owner", "admin"].includes(member.role)) return reply(403, { error: "approval_role_required" });

  if (action === "dashboard") {
    const month = input.month;
    if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return reply(400, { error: "invalid_month" });
    const [posts, channels, deliveries] = await Promise.all([
      admin.from("social_posts").select("id,business_id,body,original_media_url,media_verified,status,scheduled_at,approved_by,created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(200),
      admin.from("social_channels").select("id,business_id,platform,display_name,status,publish_authorized").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100),
      admin.from("social_deliveries").select("business_id,state").eq("business_id", businessId).limit(1000),
    ]);
    if (posts.error || channels.error || deliveries.error) return reply(503, { error: "dashboard_unavailable" });
    return reply(200, { posts: posts.data ?? [], channels: channels.data ?? [], deliveries: deliveries.data ?? [] });
  }

  if (action === "create_draft") {
    const body = typeof input.body === "string" ? input.body.trim() : "";
    if (!body || body.length > 5000) return reply(400, { error: "body_required_or_too_long" });
    const { data, error } = await admin.from("social_posts").insert({ business_id: businessId, body, status: "draft" }).select("id,business_id,body,status,scheduled_at,created_at").single();
    if (error) return reply(503, { error: "save_failed" });
    return reply(201, { post: data });
  }

  if (action === "submit_approval" || action === "approve" || action === "schedule") {
    const postId = input.postId;
    if (typeof postId !== "string" || !/^[0-9a-f-]{36}$/i.test(postId)) return reply(400, { error: "invalid_post" });
    const { data: post, error: findError } = await admin.from("social_posts").select("id,status").eq("business_id", businessId).eq("id", postId).maybeSingle();
    if (findError || !post) return reply(404, { error: "post_not_found" });
    let patch: Record<string, unknown>;
    if (action === "submit_approval" && post.status === "draft") patch = { status: "pending_approval" };
    else if (action === "approve" && post.status === "pending_approval") patch = { status: "approved", approved_by: auth.user.id };
    else if (action === "schedule" && post.status === "approved") {
      const scheduledAt = input.scheduledAt;
      const timestamp = typeof scheduledAt === "string" ? Date.parse(scheduledAt) : NaN;
      if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return reply(400, { error: "schedule_must_be_future" });
      patch = { status: "scheduled", scheduled_at: new Date(timestamp).toISOString() };
    } else return reply(409, { error: "invalid_state_transition" });
    const { data, error } = await admin.from("social_posts").update(patch).eq("business_id", businessId).eq("id", postId).select("id,business_id,body,status,scheduled_at,approved_by,created_at").single();
    if (error) return reply(503, { error: "update_failed" });
    return reply(200, { post: data });
  }

  return reply(400, { error: "unknown_action" });
});
