import { BadRequestException, Controller, Post } from '@nestjs/common';

@Controller('v1/report')
export class ReportController {
  @Post('upload')
  uploadShell(): never {
    throw new BadRequestException({
      message:
        'Upload shell endpoint is active. File processing is not implemented yet.',
      details: { code: 'UPLOAD_SHELL_ONLY' },
    });
  }
}
