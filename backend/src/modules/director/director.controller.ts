import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';

class UpdateDirectorDto {
  @IsOptional() @IsString() @MaxLength(64) name?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(64) login?: string;
  @IsOptional() @IsString() @MinLength(4) @MaxLength(128) password?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('director')
export class DirectorController {
  constructor(private prisma: PrismaService) {}

  @Roles('director')
  @Get()
  async get() {
    const d = await this.prisma.director.findFirst();
    if (!d) return null;
    const { password, ...rest } = d;
    return rest;
  }

  @Roles('director')
  @Patch()
  async update(@Body() dto: UpdateDirectorDto) {
    const d = await this.prisma.director.findFirst();
    if (!d) return null;
    const data: any = { ...dto };
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    const updated = await this.prisma.director.update({ where: { id: d.id }, data });
    const { password, ...rest } = updated;
    return rest;
  }
}
