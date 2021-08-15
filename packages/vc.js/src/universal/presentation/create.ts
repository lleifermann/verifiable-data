import * as ld from "../../vc-ld";
import * as jwt from "../../vc-jwt";
import {
  CreateVerifiablePresentationOptions,
  CreatePresentationResult
} from "../../types";

export const create = async (
  options: CreateVerifiablePresentationOptions
): Promise<CreatePresentationResult> => {
  const result: CreatePresentationResult = {
    items: []
  };

  if (!options.format) {
    options.format = ["vp"];
  }

  if (options.format.includes("vp")) {
    result.items.push(
      await ld.createVerifiablePresentation({
        presentation: options.presentation,
        suite: options.suite,
        domain: options.domain,
        challenge: options.challenge,
        documentLoader: options.documentLoader
      })
    );
  }
  if (options.format.includes("vp-jwt")) {
    const suite = Array.isArray(options.suite)
      ? options.suite[0]
      : options.suite;

    const { key } = suite;

    if (!key || !key.useJwa) {
      throw new Error(
        "Cannot create credential when suite does not contain a key that supports useJwa."
      );
    }
    const k = await key.useJwa({
      detached: false,
      header: {
        kid: key.id
      }
    });
    const signer = k.signer();
    const payload: any = await jwt.createVpPayload(
      options.presentation,
      options
    );
    result.items.push(await signer.sign({ data: payload }));
  }

  return result;
};
