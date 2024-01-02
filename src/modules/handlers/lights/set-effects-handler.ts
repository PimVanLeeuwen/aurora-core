import EffectsHandler from './effects-handler';
import { LightsGroup } from '../../lights/entities';
import { LightsEffectBuilder } from '../../lights/effects/lights-effect';

export default class SetEffectsHandler extends EffectsHandler {
  /**
   * Attach the given effect to the given lightsGroup
   * @param lightsGroup
   * @param effects
   */
  public setEffect(lightsGroup: LightsGroup, effects: LightsEffectBuilder[]) {
    // Reset the current lights before setting anything new
    lightsGroup.blackout();
    this.groupEffects.set(lightsGroup, effects.map((e) => e(lightsGroup, this.trackFeatures)));
  }

  /**
   * Remove any existing effects from the lightsGroup. Will default to blackout
   * @param lightsGroup
   */
  public removeEffect(lightsGroup: LightsGroup) {
    lightsGroup.blackout();
    this.groupEffects.set(lightsGroup, null);
  }
}