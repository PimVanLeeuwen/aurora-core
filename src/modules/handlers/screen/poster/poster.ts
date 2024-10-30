export interface GewisPosterProperties {
  borrelMode: boolean;
}

export interface HubblePosterProperties {
  color: string;
}

export enum PosterType {
  UNKNOWN = 'unknown',
  ERROR = 'error',
  AGENDA = 'agenda',
  INFIMA = 'infima',
  TRAINS = 'train',
  IMAGE = 'img',
  LOGO = 'logo',
  EXTERNAL = 'extern',
  PHOTO = 'photo',
  VIDEO = 'video',
  BORREL_LOGO = 'borrel-logo',
  BORREL_PRICE_LIST = 'borrel-price-list',
  BORREL_WALL_OF_SHAME = 'borrel-wall-of-shame',
  OLYMPICS = 'olympics',
}

export enum FooterStyle {
  FULL = 'full',
  MINIMAL = 'minimal',
  HIDDEN = 'hidden',
  HIDE_CLOCK = 'hide_clock'
}

export interface BasePoster {
  id: string;
  name: string;
  label: string;
  due?: Date;
  timeout: number;
  footer: FooterStyle;
  customPosterProperties?: GewisPosterProperties | HubblePosterProperties;
}

export type LocalPosterType =
  | PosterType.AGENDA
  | PosterType.INFIMA
  | PosterType.LOGO
  | PosterType.TRAINS
  | PosterType.BORREL_LOGO
  | PosterType.BORREL_PRICE_LIST
  | PosterType.BORREL_WALL_OF_SHAME
  | PosterType.UNKNOWN;

export type LocalPoster = BasePoster & {
  type: LocalPosterType;
};

export type MediaPoster = BasePoster & {
  type: PosterType.IMAGE | PosterType.VIDEO | PosterType.EXTERNAL;
  source: string[];
};

export type PhotoPoster = BasePoster & {
  type: PosterType.PHOTO;
  albums: number[];
};

export type ErrorPoster = BasePoster & {
  type: PosterType.ERROR;
  message: string;
};

export type Poster = LocalPoster | MediaPoster | PhotoPoster | ErrorPoster;
