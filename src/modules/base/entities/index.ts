import LightsController from './lights-controller';
import Audio from './audio';
import Screen from './screen';
import { Entities as LightsEntities } from './lights';

export { default as Audio } from './audio';
export { default as LightsController } from './lights-controller';
export { default as Screen } from './screen';

export const Entities = [Audio, LightsController, Screen, ...LightsEntities];
