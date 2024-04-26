import { Controller } from '@tsoa/runtime';
import { Body, Get, Post, Put, Query, Route, Security, Tags } from 'tsoa';
import { PosterScreenHandler } from './poster-screen-handler';
// eslint-disable-next-line import/no-cycle -- TODO fix cyclic dependency
import HandlerManager from '../../../root/handler-manager';
import { Screen } from '../../../root/entities';
import { Poster } from '../../../posters/poster';
import { SecurityGroup } from '../../../../helpers/security';
import logger from '../../../../logger';
import NsTrainsService, { TrainResponse } from './ns-trains-service';
import GEWISPosterService, { GEWISPhotoAlbumParams } from './gewis-poster-service';

interface SetBorrelModeParams {
  enabled: boolean;
}

@Route('screen/poster')
@Tags('Poster screen')
export class PosterScreenController extends Controller {
  private screenHandler: PosterScreenHandler;

  constructor() {
    super();
    this.screenHandler = HandlerManager.getInstance()
      .getHandlers(Screen)
      .filter((h) => h.constructor.name === PosterScreenHandler.name)[0] as PosterScreenHandler;
  }

  @Security('local', [
    SecurityGroup.ADMIN,
    SecurityGroup.AVICO,
    SecurityGroup.BOARD,
    SecurityGroup.SCREEN_SUBSCRIBER,
  ])
  @Get('')
  public async getPosters(@Query() alwaysReturnBorrelPosters?: boolean): Promise<Poster[]> {
    if (!this.screenHandler.posterManager.posters) {
      try {
        await this.screenHandler.posterManager.fetchPosters();
      } catch (e) {
        logger.error(e);
      }
    }
    const posters = this.screenHandler.posterManager.posters ?? [];
    if (alwaysReturnBorrelPosters) return posters;
    if (this.screenHandler.borrelMode) return posters;
    return posters.filter((p) => !p.borrelMode);
  }

  @Security('local', [SecurityGroup.ADMIN, SecurityGroup.AVICO, SecurityGroup.BOARD])
  @Post('force-update')
  public async forceUpdatePosters(): Promise<void> {
    await this.screenHandler.posterManager.fetchPosters();
    this.screenHandler.forceUpdate();
  }

  @Security('local', [SecurityGroup.ADMIN, SecurityGroup.AVICO, SecurityGroup.BOARD])
  @Put('borrel-mode')
  public async setPosterBorrelMode(@Body() { enabled }: SetBorrelModeParams): Promise<void> {
    this.screenHandler.setBorrelModeEnabled(enabled);
  }

  @Security('local', [SecurityGroup.SCREEN_SUBSCRIBER])
  @Get('train-departures')
  public async getTrains(): Promise<TrainResponse[]> {
    return new NsTrainsService().getTrains();
  }

  @Security('local', [SecurityGroup.SCREEN_SUBSCRIBER])
  @Post('photo')
  public async getPhoto(@Body() params: GEWISPhotoAlbumParams) {
    return new GEWISPosterService().getPhoto(params);
  }
}
