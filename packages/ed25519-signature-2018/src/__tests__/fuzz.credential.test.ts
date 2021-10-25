import { Ed25519Signature2018, Ed25519VerificationKey2018 } from "..";
import rawKeyJson from "../__fixtures__/key.json";
import rawCredentialJson from "../__fixtures__/credentials/case-1.json";
import documentLoader from "../__fixtures__/documentLoader";

import pointer from "json-pointer";

const objectToMessages = (obj: any) => {
  const dict = pointer.dict(obj);
  const messages = Object.keys(dict).map((key) => {
    return `{"${key}": "${dict[key]}"}`;
  });
  return messages;
};

const messagesToObject = (messages: string[]) => {
  const obj = {};
  messages
    .map((m) => {
      return JSON.parse(m);
    })
    .forEach((m) => {
      const [key] = Object.keys(m);
      const value = m[key];
      pointer.set(obj, key, value);
    });
  return obj;
};

export { objectToMessages, messagesToObject };

let proof: any;
const purpose = {
  // ignore validation of dates and such...
  validate: () => {
    return { valid: true };
  },
  update: (proof: any) => {
    proof.proofPurpose = "assertionMethod";
    return proof;
  },
};

const expectUntamperedSuccess = async (tampered: any) => {
  const suite = new Ed25519Signature2018();
  // confirm that tampering has NOT occured
  expect(tampered).toEqual(rawCredentialJson);
  const result = await suite.verifyProof({
    // assume function arguments will be mutated.
    proof: JSON.parse(JSON.stringify(proof)),
    // assume function arguments will be mutated.
    document: JSON.parse(JSON.stringify(tampered)),
    purpose,
    documentLoader,
    compactProof: false,
  });
  // ensure the credential verifies when it matches the original document
  expect(result.verified).toBe(true);
};

const expectTamperFailure = async (tampered: any) => {
  const suite = new Ed25519Signature2018();
  // confirm that tampering has occured
  expect(tampered).not.toEqual(rawCredentialJson);
  const result = await suite.verifyProof({
    // assume function arguments will be mutated.
    proof: JSON.parse(JSON.stringify(proof)),
    // assume function arguments will be mutated.
    document: JSON.parse(JSON.stringify(tampered)),
    purpose,
    documentLoader,
    compactProof: false,
  });
  // ensure the credential fails to verify
  expect(result.verified).toBe(false);
};

const tamperType = (value: any) => {
  if (typeof value === "number") {
    return value + 42;
  }
  if (typeof value === "string") {
    return value + " additional data";
  }
  throw new Error("No tamper set for type" + typeof value);
};

it("should create proof with many terms", async () => {
  const keyPair = await Ed25519VerificationKey2018.from(rawKeyJson);
  const suite = new Ed25519Signature2018({
    key: keyPair,
    date: rawCredentialJson.issuanceDate,
  });
  proof = await suite.createProof({
    document: rawCredentialJson,
    purpose,
    documentLoader,
    compactProof: false,
  });
  // console.log(JSON.stringify(proof, null, 2));
});

describe("verification should PASS", () => {
  it("when terms are not tampered with", async () => {
    expect.assertions(2);
    // just a copy, no changes.
    const tampered = JSON.parse(JSON.stringify(rawCredentialJson));
    await expectUntamperedSuccess(tampered);
  });

  it("when terms are not tampered with", async () => {
    expect.assertions(3);
    const tampered = JSON.parse(JSON.stringify(rawCredentialJson));
    const messages = objectToMessages(tampered);
    const tampered1 = messagesToObject(messages);
    expect(tampered1).toEqual(rawCredentialJson);
    await expectUntamperedSuccess(tampered1);
  });
});

describe("verification should FAIL", () => {
  const tampered = JSON.parse(JSON.stringify(rawCredentialJson));
  const messages = objectToMessages(tampered);

  messages.forEach((m) => {
    const parsed = JSON.parse(m);

    const [value] = Object.values(parsed);
    const getObjectWithNewValueForKey = (m: string) => {
      const tamperedMessages = JSON.parse(JSON.stringify(messages));
      const messageIndex = tamperedMessages.findIndex((mi: string) => {
        return mi === m;
      });
      const [key1] = Object.keys(JSON.parse(m));
      const [value1] = Object.values(JSON.parse(m));
      tamperedMessages[messageIndex] = JSON.stringify({
        [key1]: tamperType(value1),
      });
      const tampered = messagesToObject(tamperedMessages);
      return tampered;
    };

    it(`when ${value} is changed`, async () => {
      expect.assertions(2);
      const tampered = getObjectWithNewValueForKey(m);
      await expectTamperFailure(tampered);
    });
  });
});