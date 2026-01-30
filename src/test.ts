// test.ts - API Test Suite
import request from 'supertest';
import { expect } from 'chai';

const API_URL = 'http://localhost:3000';

describe('Cortensor Validation API', () => {
  let validationId: string;

  describe('POST /infer', () => {
    it('should create a new validation request', async () => {
      const response = await request(API_URL)
        .post('/infer')
        .send({ prompt: 'What is 2 + 2?' })
        .expect(200);

      expect(response.body).to.have.property('validationId');
      expect(response.body).to.have.property('workerCount');
      expect(response.body.workerCount).to.be.at.least(3);

      validationId = response.body.validationId;
    });

    it('should reject requests without prompt', async () => {
      await request(API_URL)
        .post('/infer')
        .send({})
        .expect(400);
    });

    it('should handle multiple concurrent requests', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(API_URL)
          .post('/infer')
          .send({ prompt: 'Test concurrent inference' })
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('validationId');
      });
    });
  });

  describe('POST /validate', () => {
    before(async () => {
      // Create a validation first
      const response = await request(API_URL)
        .post('/infer')
        .send({ prompt: 'Test validation' });
      validationId = response.body.validationId;
      
      // Wait for workers to respond
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    it('should compute trust score', async () => {
      const response = await request(API_URL)
        .post('/validate')
        .send({ validationId })
        .expect(200);

      expect(response.body).to.have.property('trustScore');
      expect(response.body.trustScore).to.be.within(0, 100);
      expect(response.body).to.have.property('consensusReached');
      expect(response.body).to.have.property('evidenceBundle');
      expect(response.body.evidenceBundle).to.have.property('ipfsCid');
    });

    it('should reject invalid validation ID', async () => {
      await request(API_URL)
        .post('/validate')
        .send({ validationId: 'invalid-id' })
        .expect(500);
    });

    it('should create evidence bundle on IPFS', async () => {
      const response = await request(API_URL)
        .post('/validate')
        .send({ validationId });

      expect(response.body.evidenceBundle.ipfsCid).to.match(/^Qm|^bafy/);
    });
  });

  describe('GET /validation/:id', () => {
    it('should retrieve validation details', async () => {
      const response = await request(API_URL)
        .get(`/validation/${validationId}`)
        .expect(200);

      expect(response.body).to.have.property('validationId');
      expect(response.body).to.have.property('trustScore');
      expect(response.body).to.have.property('consensusReached');
      expect(response.body).to.have.property('workerCount');
    });

    it('should handle non-existent validation ID', async () => {
      await request(API_URL)
        .get('/validation/non-existent-id')
        .expect(500);
    });
  });

  describe('GET /worker/:address', () => {
    it('should retrieve worker reputation', async () => {
      const response = await request(API_URL)
        .get('/worker/0x123...')
        .expect(200);

      expect(response.body).to.have.property('worker');
      expect(response.body).to.have.property('reputation');
      expect(response.body.reputation).to.be.within(0, 100);
    });
  });

  describe('Trust Score Calculation', () => {
    it('should reach consensus for deterministic queries', async () => {
      const response1 = await request(API_URL)
        .post('/infer')
        .send({ prompt: 'What is 2 + 2?' });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const response2 = await request(API_URL)
        .post('/validate')
        .send({ validationId: response1.body.validationId });

      expect(response2.body.trustScore).to.be.above(80);
      expect(response2.body.consensusReached).to.be.true;
    });

    it('should detect outliers in responses', async () => {
      // This would need mocked responses with intentional outliers
      const response = await request(API_URL)
        .post('/infer')
        .send({ prompt: 'Complex ambiguous question' });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const validation = await request(API_URL)
        .post('/validate')
        .send({ validationId: response.body.validationId });

      expect(validation.body.evidenceBundle).to.have.property('outlierCount');
    });
  });

  describe('Evidence Bundle Verification', () => {
    it('should generate valid ERC-8004 format', async () => {
      const infer = await request(API_URL)
        .post('/infer')
        .send({ prompt: 'Generate evidence bundle test' });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const validate = await request(API_URL)
        .post('/validate')
        .send({ validationId: infer.body.validationId });

      const bundle = validate.body.evidenceBundle;
      
      // Verify required fields
      expect(bundle).to.have.property('ipfsCid');
      expect(bundle).to.have.property('workerCount');
      expect(bundle).to.have.property('avgSimilarity');
      expect(bundle).to.have.property('outlierCount');
    });
  });
});