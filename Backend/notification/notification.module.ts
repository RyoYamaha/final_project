import { Global, Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../prisma/prisma.module';
@Global()
@Module({
    imports: [PrismaModule],
    controllers: [NotificationController],
    providers: [NotificationService],
})
export class NotificationModule {}
