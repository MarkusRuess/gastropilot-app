// Only retry transient infrastructure failures, never failed business assertions.
export function recoveryDecision({conclusion,attempt,event,headMatches}={}){
 if(headMatches!==true||attempt!==1||!['schedule','workflow_dispatch'].includes(event))return 'manual';
 return conclusion==='timed_out'?'retry-once':'manual';
}
