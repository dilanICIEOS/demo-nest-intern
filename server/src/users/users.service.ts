import { Injectable } from '@nestjs/common';
import { User } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        hashedPassword: true,
        isEmailVerified: true,
        isRevokedPassword: true,
        updatePasswordToken: true,
        isEnabled2FA: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async createUser(email: string, hashedPassword: string): Promise<User> {
    const newUser = await this.prisma.user.create({
      data: {
        email,
        hashedPassword,
        isEmailVerified: false,
        isRevokedPassword: false,
        updatePasswordToken: '',
      },
    });
    return newUser;
  }

  async markEmailAsVerified(email: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });
    return updatedUser;
  }

  async updatePassword(email: string, hashedPassword: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: {
        hashedPassword,
        isRevokedPassword: false,
        updatePasswordToken: '',
      },
    });
    return updatedUser;
  }

  async revokePassword(email: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: {
        isRevokedPassword: true,
        updatePasswordToken: '',
      },
    });
    return updatedUser;
  }

  async setUpdatePasswordToken(email: string, token: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: { updatePasswordToken: token },
    });
    return updatedUser;
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  async update2FA(email: string, enable: boolean): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: { isEnabled2FA: enable },
    });
    return updatedUser;
  }
}
