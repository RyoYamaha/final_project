import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.enum';
import { AdminService } from './admin.service';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin')
export class AdminController {
    constructor(private readonly service: AdminService) {}

    @Get('review-queue')
    getReviewQueue() {
        return this.service.getReviewQueue();
    }

    @Get('chapters/:id')
    getChapterDetail(@Param('id') id: string) {
        return this.service.GetChapterDetail(id);
    }

    @Patch('chapters/:id/approve')
    approveChapter(@Param('id') id: string) {
        return this.service.ApproveChapter(id);
    }

    @Patch('chapters/:id/reject')
    rejectChapter(@Param('id') id: string) {
        return this.service.RejectChapter(id);
    }

    @Get('content')
    getAllContents() {
        return this.service.getAllContents();
    }

    // Content moderation
    @Patch(['content/:id/approve', 'content/:id/approval'])
    approveContent(@Param('id') id: string) {
        return this.service.ApproveContent(id);
    }

    @Patch('content/:id/reject')
    rejectContent(@Param('id') id: string, @Body() body: { reason?: string }) {
        return this.service.RejectContent(id, body?.reason);
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
    @Get('users')
    getAllUsers() {
        return this.service.getAllUsers();
    }

    @Patch('users/:id')
    updateUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
        return this.service.updateUser(id, dto);
    }

    @Patch('users/:id/lock')
    lockUser(@Param('id') id: string, @CurrentUser('id') adminId: string) {
        return this.service.LockUser(id, adminId);
    }

    @Patch('users/:id/unlock')
    unlockUser(@Param('id') id: string) {
        return this.service.UnlockUser(id);
    }
}