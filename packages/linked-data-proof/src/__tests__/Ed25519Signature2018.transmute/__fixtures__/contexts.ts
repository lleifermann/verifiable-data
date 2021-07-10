import cre from "@transmute/credentials-context";
import sec from "@transmute/security-context";
import did from "@transmute/did-context";

export const contexts: any = {
  [sec.constants.ED25519_2018_v1_URL]: sec.contexts.get(
    sec.constants.ED25519_2018_v1_URL
  ),
  [cre.constants.CREDENTIALS_CONTEXT_V1_URL]: cre.contexts.get(
    cre.constants.CREDENTIALS_CONTEXT_V1_URL
  ),
  [did.constants.DID_CONTEXT_V1_URL]: did.contexts.get(
    did.constants.DID_CONTEXT_V1_URL
  ),

  // Need to make these not required.
  [sec.constants.SECURITY_CONTEXT_V1_URL]: sec.contexts.get(
    sec.constants.SECURITY_CONTEXT_V1_URL
  ),
  [sec.constants.SECURITY_CONTEXT_V2_URL]: sec.contexts.get(
    sec.constants.SECURITY_CONTEXT_V2_URL
  ),
};
