import { Controller } from '@tsoa/runtime';
import { Body, Get, Post, Put, Query, Request, Route, Security, Tags } from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { PosterScreenHandler } from './poster-screen-handler';
// eslint-disable-next-line import/no-cycle -- TODO fix cyclic dependency
import HandlerManager from '../../../root/handler-manager';
import { Screen } from '../../../root/entities';
import { Poster } from './poster';
import { SecurityGroup } from '../../../../helpers/security';
import logger from '../../../../logger';
import NsTrainsService, { TrainResponse } from './ns-trains-service';
import GEWISPosterService, { GEWISPhotoAlbumParams } from './gewis-poster-service';
import OlympicsService from './olympics-service';

export enum PosterModesBase {
  STANDARD = 'STANDARD'
}

export enum PosterModesGewis {
  BORREL = 'BORREL',
}

export enum PosterModesHubble {
  COBO = 'COBO',
  LAST_CALL = 'LAST_CALL',
  CLOSED = 'CLOSED'
}

export type PosterModeAll = PosterModesBase | PosterModesGewis | PosterModesHubble;

interface PosterModeParams {
  mode: PosterModeAll;
}

interface PosterResponse {
  posters: Poster[];
  mode: PosterModeAll;
}

@Route('handler/screen/poster')
@Tags('Handlers')
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
  public async getPosters(): Promise<PosterResponse> {
    if (!this.screenHandler.posterManager.posters) {
      try {
        await this.screenHandler.posterManager.fetchPosters();
      } catch (e) {
        logger.error(e);
      }
    }
    const posters = this.screenHandler.posterManager.posters ?? [];
    return {
      posters: posters,
      mode: this.screenHandler.mode
    };
  }

  @Security('local', [SecurityGroup.ADMIN, SecurityGroup.AVICO, SecurityGroup.BOARD])
  @Post('force-update')
  public async forceUpdatePosters(@Request() req: ExpressRequest): Promise<void> {
    logger.audit(req.user, 'Force fetch posters from source.');
    await this.screenHandler.posterManager.fetchPosters();
    this.screenHandler.forceUpdate();
  }

  @Security('local', [
    SecurityGroup.ADMIN,
    SecurityGroup.AVICO,
    SecurityGroup.BAC,
    SecurityGroup.BOARD,
  ])
  @Get('poster-mode')
  public async getPosterMode(): Promise<PosterModeParams> {
    return { mode: this.screenHandler.mode };
  }

  @Security('local', [
    SecurityGroup.ADMIN,
    SecurityGroup.AVICO,
    SecurityGroup.BAC,
    SecurityGroup.BOARD,
  ])
  @Put('borrel-mode')
  public async setPosterMode(
    @Request() req: ExpressRequest,
    @Body() body: PosterModeParams,
  ): Promise<void> {
    const { mode } = body;
    logger.audit(req.user, `Set poster screen mode to "${mode}".`);
    this.screenHandler.setMode(mode);
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

  @Security('local', [SecurityGroup.SCREEN_SUBSCRIBER])
  @Get('olympics/medal-table')
  public async getOlympicsMedalTable() {
    return new OlympicsService().getMedalTable();
  }

  @Security('local', [SecurityGroup.SCREEN_SUBSCRIBER])
  @Get('olympics/country-medals')
  public async getDutchOlympicMedals() {
    return new OlympicsService().getDutchMedals();
  }
}
