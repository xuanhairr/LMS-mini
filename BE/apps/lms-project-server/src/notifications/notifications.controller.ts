import {
  Controller, Get, Patch, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { DefaultAuthGuard } from '../auth/defaultAuth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(DefaultAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Lấy danh sách thông báo của user hiện tại */
  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getNotifications(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  /** Lấy số lượng chưa đọc */
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  /** Đánh dấu 1 thông báo đã đọc */
  @Patch(':id/read')
  async markOneAsRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }

  /** Đánh dấu tất cả thông báo đã đọc */
  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAsRead(req.user.id);
  }
}
