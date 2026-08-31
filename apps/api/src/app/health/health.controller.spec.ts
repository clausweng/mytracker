import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports the service as up', () => {
    expect(new HealthController().check()).toEqual({ status: 'ok' });
  });
});
