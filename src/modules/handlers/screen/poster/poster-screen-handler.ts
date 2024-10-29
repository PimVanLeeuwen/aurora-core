import {Namespace} from 'socket.io';
import BaseScreenHandler from '../../base-screen-handler';
import {TrackChangeEvent} from '../../../events/music-emitter-events';
import {PosterManager} from './poster-manager';
import {TrelloPosterManager} from './trello/trello-poster-manager';
import {PosterModeAll, PosterModesBase, PosterModesGewis, PosterModesHubble} from "./poster-screen-controller";

export class PosterScreenHandler extends BaseScreenHandler {
  public posterManager: PosterManager;

  public mode: PosterModeAll;

  private borrelModeDay: number | undefined;

  public borrelModeInterval: NodeJS.Timeout;

  constructor(socket: Namespace) {
    super(socket);
    this.posterManager = new TrelloPosterManager();

    // Check whether we need to enable/disable borrel mode
    this.borrelModeInterval = setInterval(this.checkBorrelMode.bind(this), 60 * 1000);
  }

  public get borrelMode() {
    return this.mode == PosterModesGewis.BORREL;
  }

  public get closedMode() {
    return this.mode == PosterModesHubble.CLOSED;
  }

  public get lastCallMode() {
    return this.mode == PosterModesHubble.LAST_CALL;
  }

  public get coboMode() {
    return this.mode = PosterModesHubble.COBO;
  }

  private checkBorrelMode() {
    const now = new Date();

    // If borrelmode is enabled, but we arrive at the next day, disable borrelmode again
    if (this.borrelMode && this.borrelModeDay !== now.getDay()) {
      this.mode = PosterModesBase.STANDARD;
      this.borrelModeDay = undefined;
      return;
    }
    // if borrelmode is enabled, we do not have to check whether we can enable it
    if (this.borrelMode) return;

    // By default, enable borrelmode on Thursdays 16:30 local time
    if (
      now.getDay() === 4 &&
      ((now.getHours() === 16 && now.getMinutes() >= 30) || now.getHours() >= 17)
    ) {
      this.mode = PosterModesGewis.BORREL;
      this.borrelModeDay = now.getDay();
    }
  }

  public setMode(mode: PosterModeAll) {
    switch (mode) {
      case PosterModesGewis.BORREL: {
        this.setBorrelModeEnabled(true);
        break;
      }
      default: {
        this.mode = mode;
      }
    }
  }

  public setBorrelModeEnabled(enabled: boolean) {
    if (enabled) {
      this.mode = PosterModesGewis.BORREL;
      this.borrelModeDay = new Date().getDay();
    } else {
      this.borrelModeDay = undefined;
    }
  }

  forceUpdate(): void {
    this.sendEvent('update_posters');
  }

  // Do nothing
  beat(): void {}

  changeTrack(event: TrackChangeEvent[]): void {
    this.sendEvent('change_track', event);
  }
}
