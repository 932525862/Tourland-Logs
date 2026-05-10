import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '@/prisma/prisma.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

class CreateCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(64) name!: string;
  @IsOptional() @IsBoolean() isArchive?: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.category.findMany({ orderBy: { createdAt: 'asc' } });
  }

  @Roles('director')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  @Roles('director')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat || cat.isArchive) return { ok: false };
    const fallback = await this.prisma.category.findFirst({ where: { isArchive: false, NOT: { id } } });
    if (fallback) {
      await this.prisma.client.updateMany({ where: { categoryId: id }, data: { categoryId: fallback.id } });
    }
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }
}
