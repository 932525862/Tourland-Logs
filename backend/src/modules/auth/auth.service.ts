import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.module';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(login: string, password: string) {
    // Try director first
    const director = await this.prisma.director.findUnique({ where: { login } });
    if (director && (await bcrypt.compare(password, director.password))) {
      return this.issue({ sub: director.id, role: 'director', name: director.name, login: director.login });
    }
    const emp = await this.prisma.employee.findUnique({ where: { login } });
    if (emp && (await bcrypt.compare(password, emp.password))) {
      return this.issue({
        sub: emp.id,
        role: 'employee',
        name: `${emp.firstName} ${emp.lastName}`,
        login: emp.login,
      });
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  private issue(payload: { sub: string; role: 'director' | 'employee'; name: string; login: string }) {
    const token = this.jwt.sign(payload);
    return { token, user: payload };
  }
}
