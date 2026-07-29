import { Test, TestingModule } from '@nestjs/testing';
import { MessagingGateway } from './messaging.gateway';

describe('MessagingGateway', () => {
  let gateway: MessagingGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagingGateway],
    }).compile();

    gateway = module.get<MessagingGateway>(MessagingGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
