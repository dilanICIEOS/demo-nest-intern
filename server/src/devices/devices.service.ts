import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Device } from 'src/generated/prisma/client';
// import { Device } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async getAllDevicesByUserId(userId: string): Promise<Device[] | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const devices = await this.prisma.device.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        deviceFingerprint: true,
        deviceName: true,
        userAgent: true,
        ipAddress: true,
        isTrusted: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
    return devices as Device[] | null;
  }

  async getDeviceById(deviceId: string): Promise<Device | null> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    return device as Device | null;
  }

  async addOrUpdateDevice(request: Request, userId: string, isTrusted: boolean): Promise<Device> {
    
    const existingDevice = await this.prisma.device.findFirst({
      where: {
        userId,
        deviceFingerprint: "" as string,
      },
    });
    if (existingDevice) {
      const updatedDevice = await this.prisma.device.update({
        where: { id: existingDevice.id },
        data: {
          deviceName: "" as string,
          userAgent: request.headers['user-agent'] as string,
          ipAddress: request.ip || request.socket?.remoteAddress || '',
          isTrusted,
        },
      });
      return updatedDevice;
    }
    const device = await this.prisma.device.create({
      data: {
        userId,
        deviceFingerprint: "" as string,
        deviceName: "" as string,
        userAgent: request.headers['user-agent'] as string,
        ipAddress: request.ip || request.socket?.remoteAddress || '',
        isTrusted,
      },
    });
    return device;
  }
}
