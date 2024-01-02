import { Controller } from '@tsoa/runtime';
import {
  Body, Get, Route, Tags, Response, Post,
} from 'tsoa';
import InformationService, { InformationParams } from './information-service';
import Information from './entities/information';
import { InternalError, ValidateErrorJSON } from '../../helpers/customError';

@Route('infoscreen')
@Tags('Infoscreen')
export class InformationController extends Controller {
  @Get('information')
  @Response<InternalError>(500, 'Internal Server Error')
  public async getInformation(): Promise<Information> {
    return new InformationService().getInformation();
  }

  @Post('information')
  @Response<ValidateErrorJSON>(422, 'Validation failed')
  @Response<InternalError>(500, 'Internal Server Error')
  public async setInformation(
    @Body() params: InformationParams,
  ): Promise<Information> {
    return new InformationService().setInformation(params);
  }
}