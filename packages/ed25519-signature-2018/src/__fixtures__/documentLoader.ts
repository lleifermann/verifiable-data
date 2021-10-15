const dids: any = {
  ["did:key:z6MktWjP95fMqCMrfNULcdszFeTVUCE1zcgz3Hv5bVAisHgk#z6MktWjP95fMqCMrfNULcdszFeTVUCE1zcgz3Hv5bVAisHgk"]: require("./dids/did-document.json"),
};
const contexts: any = {
  ["https://www.w3.org/2018/credentials/v1"]: require("./contexts/credential-v1.json"),
  ["https://www.w3.org/ns/did/v1"]: require("./contexts/did-v1.json"),
  ["https://w3id.org/security/suites/ed25519-2018/v1"]: require("./contexts/ed25519-2018-v1.json"),
  ["https://w3id.org/security/suites/x25519-2019/v1"]: require("./contexts/x25519-2019-v1.json"),
};
const documentLoader = (iri: string) => {
  if (contexts[iri]) {
    return { document: contexts[iri] };
  }
  if (dids[iri]) {
    return { document: dids[iri] };
  }
  console.warn(iri);
  throw new Error(`iri ${iri} not supported`);
};

export default documentLoader;
