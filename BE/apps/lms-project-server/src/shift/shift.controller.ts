import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { DefaultAuthGuard } from '../auth/defaultAuth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('shifts')
@Controller('shifts')
export class ShiftController {
    constructor(private readonly shiftService: ShiftService) {}

    @Post()
    @UseGuards(DefaultAuthGuard)
    create(@Body() data: any) {
        return this.shiftService.create(data);
    }

    @Get()
    @UseGuards(DefaultAuthGuard)
    findAll(@Query() query: any) {
        return this.shiftService.findAll({ orderBy: { startTime: 'asc' } });
    }

    @Get(':id')
    @UseGuards(DefaultAuthGuard)
    findOne(@Param('id') id: string) {
        return this.shiftService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(DefaultAuthGuard)
    update(@Param('id') id: string, @Body() data: any) {
        return this.shiftService.update(id, data);
    }

    @Delete(':id')
    @UseGuards(DefaultAuthGuard)
    remove(@Param('id') id: string) {
        return this.shiftService.remove(id);
    }
}
