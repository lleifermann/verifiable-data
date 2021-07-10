import jsonld from "jsonld";
import { serializeError } from "serialize-error";

import strictExpansionMap from "./strictExpansionMap";

import { IProofSetAddOptions } from "./types";

export class ProofSet {
  async add(
    document: any,
    {
      suite,
      purpose,
      documentLoader,
      expansionMap,
      compactProof = true,
    }: IProofSetAddOptions = { compactProof: true }
  ) {
    if (!suite) {
      throw new TypeError('"options.suite" is required.');
    }
    if (!documentLoader) {
      throw new TypeError('"options.documentLoader" is required.');
    }
    if (!purpose) {
      throw new TypeError('"options.purpose" is required.');
    }

    if (suite.legacy) {
      throw new TypeError(`Legacy suites are no longer supported.`);
    }

    if (expansionMap !== false) {
      expansionMap = strictExpansionMap;
    }

    if (typeof document === "string") {
      // fetch document
      document = await documentLoader(document);
    }

    // preprocess document to prepare to remove existing proofs
    let input = { ...document };

    // save but exclude any existing proof(s)
    const proofProperty = "proof";
    //const existingProofs = input[proofProperty];
    delete input[proofProperty];

    // create the new proof (suites MUST output a proof using the security-v2
    // `@context`)
    const proof = await suite.createProof({
      document: input,
      purpose,
      documentLoader,
      expansionMap,
      compactProof,
    });

    jsonld.addValue(document, proofProperty, proof);

    return document;
  }

  private _getProofs = async ({
    document,
    documentLoader,
    expansionMap,
    compactProof,
  }: any) => {
    // handle document preprocessing to find proofs
    const proofProperty = "proof";
    let proofSet;

    if (compactProof) {
      // if we must compact the proof(s) then we must first compact the input
      // document to find the proof(s)
      const context = document["@context"];
      // console.log(document);
      document = await jsonld.compact(document, context, {
        documentLoader,
        expansionMap,
        compactToRelative: false,
      });
    }
    proofSet = jsonld.getValues(document, proofProperty);
    delete document[proofProperty];

    if (proofSet.length === 0) {
      // no possible matches
      throw new Error("No matching proofs found in the given document.");
    }

    // TODO: consider in-place editing to optimize
    const context = document["@context"];
    proofSet = proofSet.map((proof: any) => ({
      "@context": context,
      ...proof,
    }));

    return { proofSet, document };
  };

  private _verify = async ({
    document,
    suites,
    proofSet,
    purpose,
    documentLoader,
    expansionMap,
    compactProof,
  }: any) => {
    // filter out matching proofs
    const result = await Promise.all(
      proofSet.map((proof: any) =>
        purpose.match(proof, { document, documentLoader, expansionMap })
      )
    );
    const matches = proofSet.filter((_value: any, index: any) => result[index]);
    if (matches.length === 0) {
      // no matches, nothing to verify
      return [];
    }

    // verify each matching proof
    return (
      await Promise.all(
        matches.map(async (proof: any) => {
          for (const s of suites) {
            if (
              await s.matchProof({
                proof,
                document,
                documentLoader,
                expansionMap,
              })
            ) {
              return s
                .verifyProof({
                  proof,
                  document,
                  purpose,
                  documentLoader,
                  expansionMap,
                  compactProof,
                })
                .catch((error: any) => ({ verified: false, error }));
            }
          }
        })
      )
    )
      .map((r: any, i) => {
        if (!r) {
          return null;
        }
        if (r.error) {
          this._addToJSON(r.error);
        }
        return { proof: matches[i], ...r };
      })
      .filter((r) => r);
  };

  private _addToJSON = (error: any) => {
    Object.defineProperty(error, "toJSON", {
      value: function() {
        return serializeError(this);
      },
      configurable: true,
      writable: true,
    });
  };

  public verify = async (
    document: any,
    {
      suite,
      purpose,
      documentLoader,
      expansionMap,
      compactProof = true,
    }: any = {}
  ) => {
    if (!suite) {
      throw new TypeError('"options.suite" is required.');
    }
    if (!purpose) {
      throw new TypeError('"options.purpose" is required.');
    }
    const suites = Array.isArray(suite) ? suite : [suite];
    if (suites.length === 0) {
      throw new TypeError("At least one suite is required.");
    }
    const legacy = suites.some((s) => s.legacy);
    if (legacy) {
      throw new TypeError(`Legacy suites are no longer supported.`);
    }

    if (!documentLoader) {
      throw new TypeError('"options.documentLoader" is required.');
    }
    if (expansionMap !== false) {
      expansionMap = strictExpansionMap;
    }

    try {
      if (typeof document === "string") {
        // fetch document
        document = await documentLoader(document);
      } else {
        // TODO: consider in-place editing to optimize when `compactProof`
        // is `false`
        // never mutate function arguments.
        document = JSON.parse(JSON.stringify(document));
      }

      // get proofs from document
      const { proofSet, document: doc } = await this._getProofs({
        document,
        documentLoader,
        expansionMap,
        compactProof,
      });

      document = doc;

      // verify proofs
      const results = await this._verify({
        document,
        suites,
        proofSet,
        purpose,
        documentLoader,
        expansionMap,
        compactProof,
      });

      if (results.length === 0) {
        throw new Error(
          "Could not verify any proofs; no proofs matched the required " +
            "suite and purpose."
        );
      }

      // combine results
      const verified = results.some((r) => r.verified);
      if (!verified) {
        const errors = [].concat(
          ...results.filter((r) => r.error).map((r) => r.error)
        );
        const result: any = { verified, results };
        if (errors.length > 0) {
          result.error = errors;
        }
        return result;
      }
      return { verified, results };
    } catch (error) {
      this._addToJSON(error);
      return { verified: false, error };
    }
  };
}
