// A provider call must never leave the server until a central, atomic cost
// reservation and a verified upper bound for that specific request exist.
// The current policy is disabled. No environment flag or caller input can
// enable paid usage; returning a response lets callers keep manual entry open.
export async function guardedPaidFetch(..._args) {
  return new Response(JSON.stringify({error:{code:'PAID_AI_DISABLED',message:'KI-Auswertung pausiert. Manuelle Erfassung verwenden.'}}), {
    status:503,
    headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
  });
}
