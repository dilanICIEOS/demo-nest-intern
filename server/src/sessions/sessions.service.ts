import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Session } from 'src/generated/prisma/client';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SessionsService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async generateTokens(
    userId: string,
    email: string,
    deviceId: string,
    sessionId: string,
  ) {
    const payload = {
      sub: userId,
      email,
      deviceId,
      sessionId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateSession(
    sessionId: string,
    userId: string,
    deviceId: string,
    token: string,
  ): Promise<boolean> {
    const session = await this.prismaService.session.findUnique({
      where: { id: sessionId },
    });
    if (session?.hashedRefreshToken === null) {
      return false;
    }
    const isTokenValid = await bcrypt.compare(
      token,
      session?.hashedRefreshToken as string,
    );
    if (
      !session ||
      session.userId !== userId ||
      session.deviceId !== deviceId ||
      !isTokenValid ||
      session.expiresAt < new Date()
    ) {
      return false;
    }
    return !!session;
  }

  async createSession(userId: string, deviceId: string): Promise<Session> {
    // const hashedRefreshToken = await bcrypt.hash(RefreshToken, 10);
    const sessionExpiresDays = Number(process.env.SESSION_EXPIRES_DAYS);
    const expiresAt = new Date(
      Date.now() + sessionExpiresDays * 24 * 60 * 60 * 1000,
    );
    return await this.prismaService.session.create({
      data: {
        userId,
        deviceId,
        hashedRefreshToken: ' ',
        expiresAt,
      },
    });
  }

  async addRefreshTokenHashToSession(
    sessionId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prismaService.session.update({
      where: { id: sessionId },
      data: { hashedRefreshToken },
    });
  }
}
