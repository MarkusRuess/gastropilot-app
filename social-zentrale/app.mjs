import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://sjnwfwcpgwsavygewwzb.supabase.co";
const SUPABASE_KEY = "sb_publishable__tucXG-IQGUhibMqMSUzCw_5RnH_sbQ";
const API_URL = `${SUPABASE_URL}/functions/v1/social-zentrale`;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
const state = { business: null, businesses: [], posts: [], channels: [], deliveries: [] };
let sessionVersion = 0;
let activeUserId = null;
const platformNames = { facebook:"Facebook", instagram:"Instagram", tiktok:"TikTok", pinterest:"Pinterest", linkedin:"LinkedIn", youtube:"YouTube", google_business:"Google Unternehmensprofil", whatsapp:"WhatsApp" };
const statusNames = { draft:"Entwurf", pending_approval:"Freigabe offen", approved:"Freigegeben", scheduled:"Im internen Kalender", publishing:"Wird veröffentlicht", published:"Veröffentlicht", failed:"Fehler" };

function escapeText(value="") { return String(value); }
function dateLabel(value) { if (!value) return "Kein Termin"; return new Intl.DateTimeFormat("de-AT",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)); }
function notice(message, kind="info") { const el=$("notice"); el.textContent=message; el.dataset.kind=kind; el.hidden=false; clearTimeout(notice.timer); notice.timer=setTimeout(()=>el.hidden=true,5000); }

async function request(action, extra={}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Bitte erneut anmelden.");
  const response = await fetch(API_URL, { method:"POST", headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${session.access_token}`, "apikey":SUPABASE_KEY }, body:JSON.stringify({ action, ...extra }) });
  const body = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(({forbidden:"Kein Zugriff auf diesen Betrieb.",unauthorized:"Anmeldung abgelaufen.",schedule_must_be_future:"Bitte einen zukünftigen Termin wählen.",invalid_state_transition:"Dieser Statuswechsel ist nicht zulässig."})[body.error] || "Aktion konnte nicht abgeschlossen werden.");
  return body;
}

function showSignedOut() {
  sessionVersion++; activeUserId=null;
  state.business=null; state.businesses=[]; state.posts=[]; state.channels=[]; state.deliveries=[];
  $("business").replaceChildren(); $("tiles").replaceChildren(); $("calendar").replaceChildren(); $("channels").replaceChildren();
  $("postBody").value=""; $("email").value=""; $("password").value=""; $("scheduleDialog").open && $("scheduleDialog").close();
  $("noBusiness").hidden=true; $("signin").hidden=false; $("workspace").hidden=true; $("signedUser").textContent="";
}
async function showSignedIn(user) {
  if(activeUserId!==user.id){sessionVersion++;activeUserId=user.id;}
  const version=sessionVersion;
  $("signin").hidden=true; $("workspace").hidden=false; $("noBusiness").hidden=true; $("signedUser").textContent=user.email ?? "Angemeldet";
  try {
    const result=await request("businesses");
    if(version!==sessionVersion)return;
    state.businesses=result.businesses ?? [];
    const select=$("business"); select.replaceChildren();
    for(const business of state.businesses){const option=document.createElement("option");option.value=business.id;option.textContent=business.name;select.append(option);}
    if(!state.businesses.length){$("workspace").hidden=true;$("noBusiness").hidden=false;return;}
    $("noBusiness").hidden=true;
    state.business=select.value; await refresh(version);
  } catch(error) { notice(error.message,"error"); showSignedOut(); }
}

async function refresh(version=sessionVersion) {
  if(!state.business) return;
  const businessId=state.business;
  const result=await request("dashboard",{businessId,month:$("month").value});
  if(version!==sessionVersion||businessId!==state.business)return;
  state.posts=result.posts ?? []; state.channels=result.channels ?? []; state.deliveries=result.deliveries ?? [];
  render();
}
function render() {
  const counts={drafts:state.posts.filter(x=>x.status==="draft").length,pending:state.posts.filter(x=>x.status==="pending_approval").length,scheduled:state.posts.filter(x=>x.status==="scheduled").length,published:state.deliveries.filter(x=>x.state==="published").length};
  $("tiles").replaceChildren();
  for(const [key,label] of [["drafts","Entwürfe"],["pending","Freigaben"],["scheduled","Kalendereinträge"],["published","Veröffentlicht"]]){
    const article=document.createElement("article");article.className="metric";const value=document.createElement("strong");value.textContent=counts[key];const name=document.createElement("span");name.textContent=label;article.append(value,name);$("tiles").append(article);
  }
  const posts=state.posts.filter(x=>(x.scheduled_at ?? x.created_at ?? "").slice(0,7)===$("month").value).sort((a,b)=>(a.scheduled_at??a.created_at).localeCompare(b.scheduled_at??b.created_at));
  $("calendar").replaceChildren();
  if(!posts.length){const empty=document.createElement("p");empty.className="empty";empty.textContent="Noch keine Beiträge in diesem Monat."; $("calendar").append(empty);}
  for(const post of posts){
    const card=document.createElement("article");card.className="post";
    const top=document.createElement("div");top.className="post-top";
    const status=document.createElement("span");status.className="badge";status.textContent=statusNames[post.status]??post.status;
    const date=document.createElement("time");date.textContent=dateLabel(post.scheduled_at??post.created_at);top.append(status,date);
    const body=document.createElement("p");body.textContent=post.body;
    card.append(top,body);
    const actions=document.createElement("div");actions.className="actions";
    if(post.status==="draft") actions.append(button("Zur Freigabe senden",()=>act("submit_approval",post.id)));
    if(post.status==="pending_approval") actions.append(button("Freigeben",()=>act("approve",post.id),"secondary"));
    if(post.status==="approved") actions.append(button("Termin eintragen",()=>schedule(post.id),"secondary"));
    if(actions.childNodes.length) card.append(actions);
    $("calendar").append(card);
  }
  $("channels").replaceChildren();
  if(!state.channels.length){const empty=document.createElement("p");empty.className="empty";empty.textContent="Noch keine Social-Kanäle autorisiert."; $("channels").append(empty);}
  for(const channel of state.channels){const row=document.createElement("div");row.className="channel";const name=document.createElement("strong");name.textContent=channel.display_name||platformNames[channel.platform]||channel.platform;const stateLabel=document.createElement("span");stateLabel.className="badge";stateLabel.textContent=channel.status==="connected"?(channel.publish_authorized?"Veröffentlichung erlaubt":"Verbunden, nur Lesen"):"Nicht verbunden";row.append(name,stateLabel);$("channels").append(row);}
}
function button(label,callback,style="") {const b=document.createElement("button");b.type="button";b.className=style;b.textContent=label;b.addEventListener("click",callback);return b;}
async function act(action,postId) {try{await request(action,{businessId:state.business,postId});await refresh();notice("Gespeichert.");}catch(error){notice(error.message,"error");}}
let schedulePostId=null;
function schedule(postId) {
  schedulePostId=postId;
  const form=$("scheduleForm");
  const min=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
  $("scheduledAt").min=min;
  form.reset();
  $("scheduleDialog").showModal();
}
$("scheduleForm").addEventListener("submit",async(event)=>{
  event.preventDefault();
  const parsed=new Date($("scheduledAt").value);
  if(!schedulePostId||Number.isNaN(parsed.getTime()))return notice("Bitte einen gültigen Termin wählen.","error");
  $("scheduleDialog").close();
  try{await request("schedule",{businessId:state.business,postId:schedulePostId,scheduledAt:parsed.toISOString()});await refresh();notice("Termin im internen Kalender gespeichert. Kein Social-Kanal wurde veröffentlicht.");}
  catch(error){notice(error.message,"error");}
  finally{schedulePostId=null;}
});
$("scheduleCancel").addEventListener("click",()=>{$("scheduleDialog").close();schedulePostId=null;});

$("signinForm").addEventListener("submit",async(event)=>{event.preventDefault();$("signinButton").disabled=true;try{const {error}=await supabase.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error)throw error;const {data}=await supabase.auth.getUser();await showSignedIn(data.user);}catch(error){
const status=Number(error?.status),detail=String(error?.message??"").toLowerCase();
const message=status===429?"Zu viele Anmeldeversuche. Bitte kurz warten.":status===400||detail.includes("invalid login credentials")?"E-Mail oder Passwort stimmen nicht. Nutze denselben GastroPilot-Zugang.":error instanceof TypeError?"Anmeldedienst nicht erreichbar. Bitte App in Safari öffnen und Verbindung prüfen.":"Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
notice(message,"error");
}finally{$("signinButton").disabled=false;}});
$("signout").addEventListener("click",async()=>{await supabase.auth.signOut();showSignedOut();});
$("business").addEventListener("change",async()=>{state.business=$("business").value;try{await refresh();}catch(error){notice(error.message,"error");}});
$("month").addEventListener("change",()=>refresh().catch(error=>notice(error.message,"error")));
$("draftForm").addEventListener("submit",async(event)=>{event.preventDefault();try{await request("create_draft",{businessId:state.business,body:$("postBody").value});$("postBody").value="";await refresh();notice("Entwurf gespeichert.");}catch(error){notice(error.message,"error");}});
$("month").value=new Date().toISOString().slice(0,7);
supabase.auth.onAuthStateChange((_event,session)=>{if(!session?.user) showSignedOut();});
const {data:{session}}=await supabase.auth.getSession();if(session?.user) await showSignedIn(session.user);
if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
