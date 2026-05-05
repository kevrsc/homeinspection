import {
  BadRequestException,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@Controller('v1/report')
export class ReportController {
  @UseGuards(ApiKeyGuard)
  @Post('upload')
  uploadShell(): never {
    throw new BadRequestException({
      message:
        'Upload shell endpoint is active. File processing is not implemented yet.',
      details: { code: 'UPLOAD_SHELL_ONLY' },
    });
  }
}
