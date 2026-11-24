// Fail closed until a verified central reservation service is integrated.
// No environment flag or caller-provided price may bypass this guard.
export async function guardedPaidFetch(..._args) {
  throw new Error('PAID_AI_DISABLED: central monthly budget enforcement not yet verified');
}
