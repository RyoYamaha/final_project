import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
@Controller('admin')
export class AdminController{
    constructor (private readonly service: AdminService){};
    @Get('review-queue')
    getReviewQueue(){
        return this.service.getReviewQueue();
    }
    @Patch('content/:id/approval')
    approveContent(@Param('id') id: string){
        return this.service.ApproveContent(id);
    }
    @Patch('content/:id/reject')
    rejectContent(@Param('id') id: string){
        return this.service.RejectContent(id);
    }
    @Patch('content/:id/restore')
    restoreContent(@Param('id') id: string){
        return this.service.RestoreContent(id);
    }
    @Patch('content/:id/verify')
    approveVerification(@Param('id') id: string){
        return this.service.AprroveVerification(id);
    }
    @Patch('content/:id/reject')
    rejectVerification(@Param('id') id: string){
        return this.service.RejectVerification(id);
    }
    
    @Patch('content/:d/unlock')
    unlockUser(@Param('id') id: string ){
        return this.service.UnlockUser(id);
    }
    @Patch('content/:id/lock')
    lockUser(@Param('id') id: string){
        return this.service.LockUser(id);
    }
}