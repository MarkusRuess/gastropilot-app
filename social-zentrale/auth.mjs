// Minimal Supabase Auth client for this PWA. Tokens are held in memory only.
export function createAuthClient(url, apiKey, { fetchImpl = fetch, now = () => Date.now() } = {}) {
  let session = null;
  const listeners = new Set();
  const authUrl = url.replace(/\\/$/, "") + "/auth/v1";
  const emit = (event) => { for (const listener of listeners) { try { listener(event, session); } catch {} } };
  const request = async (path, options = {}) => {
    const headers = { apikey: apiKey, "Content-Type": "application/json", ...(options.headers || {}) };
    const response = await fetchImpl(authUrl + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.msg || data.message || data.error_description || data.error || "Anmeldung fehlgeschlagen.");
      error.status = response.status;
      error.code = data.code;
      throw error;
    }
    return data;
  };
  const saveSession = (data) => {
    if (!data?.access_token || !data?.refresh_token) throw new Error("Ungültige Antwort des Anmeldedienstes.");
    const expiresAt = Number(data.expires_at) || Math.floor(now()/1000) + (Number(data.expires_in) || 3600);
    session = { access_token:data.access_token, refresh_token:data.refresh_token, token_type:data.token_type || "bearer", expires_in:Number(data.expires_in)||3600, expires_at:expiresAt, user:data.user || null };
    return session;
  };
  const getSession = async () => {
    if (!session) return { data:{ session:null }, error:null };
    if (session.expires_at <= Math.floor(now()/1000) + 30) {
      try { saveSession(await request("/token?grant_type=refresh_token",{method:"POST",body:JSON.stringify({refresh_token:session.refresh_token})})); emit("TOKEN_REFRESHED"); }
      catch (error) { session=null; emit("SIGNED_OUT"); return {data:{session:null},error}; }
    }
    return {data:{session},error:null};
  };
  return { auth: {
    async signInWithPassword({email,password}) {
      try { const data=await request("/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})}); saveSession(data); emit("SIGNED_IN"); return {data:{user:session.user,session},error:null}; }
      catch(error) { return {data:{user:null,session:null},error}; }
    },
    async getSession() { return getSession(); },
    async getUser() {
      try { const current=await getSession(); if(current.error) throw current.error; if(!current.data.session) throw new Error("Bitte erneut anmelden.");
        const user=await request("/user",{headers:{Authorization:"Bearer "+current.data.session.access_token}});
        session.user=user; return {data:{user},error:null};
      } catch(error) { return {data:{user:null},error}; }
    },
    onAuthStateChange(callback) { listeners.add(callback); return {data:{subscription:{unsubscribe(){listeners.delete(callback);}}}}; },
    async signOut() {
      if(session?.access_token) { try { await request("/logout",{method:"POST",headers:{Authorization:"Bearer "+session.access_token}}); } finally { session=null; emit("SIGNED_OUT"); } }
      else { session=null; emit("SIGNED_OUT"); }
      return {error:null};
    }
  }};
}
