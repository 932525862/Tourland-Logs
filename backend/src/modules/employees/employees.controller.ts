import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

class CreateEmployeeDto {
  @IsString() @IsNotEmpty() @MaxLength(64) firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(64) lastName!: string;
  @IsString() @MaxLength(32) phone!: string;
  @IsString() @MinLength(3) @MaxLength(64) login!: string;
  @IsString() @MinLength(4) @MaxLength(128) password!: string;
}
class UpdateEmployeeDto {
  @IsOptional() @IsString() @MaxLength(64) firstName?: string;
  @IsOptional() @IsString() @MaxLength(64) lastName?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(64) login?: string;
  @IsOptional() @IsString() @MinLength(4) @MaxLength(128) password?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.employee.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Roles('director')
  @Post()
  async create(@Body() dto: CreateEmployeeDto) {
    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.employee.create({ data: { ...dto, password } });
  }

  @Roles('director')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    const data: any = { ...dto };
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.employee.update({ where: { id }, data });
  }

  @Roles('director')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.employee.delete({ where: { id } });
  }
}
