import { walletOptions } from './memory-wallet';
import { getFastifyWithWalletOptions } from './getFastifyWithWalletOptions';
import { makeVc } from './makeVc';
import { makeVp } from './makeVp';

const fastify = getFastifyWithWalletOptions(walletOptions);
const supertest = require('supertest');

let api: any;

beforeAll(async () => {
  await fastify.ready();
  api = supertest(fastify.server);
});

afterAll(() => {
  fastify.close();
});

let aliceId = '123';
let domain: string;
let challenge: string;

test(`POST '/accounts/${aliceId}/presentations/available'`, async () => {
  const alice = await fastify.wallet.get(aliceId);

  const query = alice.createNotificationQueryRequest(
    'IntentToSellProductCategory'
  );
  const response = await api
    .post(`/accounts/${aliceId}/presentations/available`)
    .send(query);
  expect(response.status).toBe(200);
  expect(response.body.query).toBeDefined();
  expect(response.body.domain).toBeDefined();
  expect(response.body.challenge).toBeDefined();
  ({ domain, challenge } = response.body);
});

test(`POST '/accounts/${aliceId}/presentations/submissions'`, async () => {
  let alice = await fastify.wallet.get(aliceId);
  const vc = await makeVc(alice, 'IntentToSell');
  const vp = await makeVp(alice, [vc], domain, challenge);
  const response = await api
    .post(`/accounts/${aliceId}/presentations/submissions`)
    .send(vp);
  expect(response.status).toBe(200);
  expect(response.body.verified).toBe(true);
  alice = await fastify.wallet.get(aliceId);
  expect(alice.contents[3].type).toBe('FlaggedForReview');
});
