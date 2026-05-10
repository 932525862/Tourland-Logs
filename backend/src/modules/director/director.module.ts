import { Module } from '@nestjs/common';
import { DirectorController } from './director.controller';
@Module({ controllers: [DirectorController] })
export class DirectorModule {}
