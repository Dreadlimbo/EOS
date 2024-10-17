import { Test, TestingModule } from '@nestjs/testing';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';

describe('AppController', () => {
  let appController: UserManagementController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [UserManagementController],
      providers: [UserManagementService],
    }).compile();

    appController = app.get<UserManagementController>(UserManagementController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
