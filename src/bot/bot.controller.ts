import { Controller, Post, Param, Headers, Body, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  constructor(
    private botService: BotService,
    private configService: ConfigService,
  ) {}

  @Post(':token')
  async handleWebhook(
    @Param('token') token: string,
    @Headers('content-type') contentType: string,
    @Body() body: any,
  ): Promise<{ ok: boolean }> {
    const validToken = this.configService.get<string>('TELEGRAM_TOKEN');
    if (token !== validToken) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.botService.handleUpdate(body);
    return { ok: true };
  }
}