import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin')
export class AdminController {
    constructor(private readonly service: AdminService) {}

    @Get('review-queue')
    getReviewQueue() {
        return this.service.getReviewQueue();
    }

    // Content moderation
    @Patch(['content/:id/approve', 'content/:id/approval'])
    approveContent(@Param('id') id: string) {
        return this.service.ApproveContent(id);
    }

    @Patch('content/:id/reject')
    rejectContent(@Param('id') id: string) {
        return this.service.RejectContent(id);
    }

    @Patch('content/:id/hide')
    hideContent(@Param('id') id: string) {
        return this.service.HideContent(id);
    }

    @Patch('content/:id/restore')
    restoreContent(@Param('id') id: string) {
        return this.service.RestoreContent(id);
    }

    // Publisher verification
    @Patch('publishers/:id/verify')
    approveVerification(@Param('id') id: string) {
        return this.service.AprroveVerification(id);
    }

    @Patch('publishers/:id/reject')
    rejectVerification(@Param('id') id: string) {
        return this.service.RejectVerification(id);
    }

    // User management
    @Patch('users/:id/lock')
    lockUser(@Param('id') id: string) {
        return this.service.LockUser(id);
    }

    @Patch('users/:id/unlock')
    unlockUser(@Param('id') id: string) {
        return this.service.UnlockUser(id);
    }
}