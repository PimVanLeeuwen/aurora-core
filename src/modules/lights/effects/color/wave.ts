import LightsEffect, { BaseLightsEffectCreateParams, LightsEffectBuilder } from '../lights-effect';
import { LightsGroup, LightsGroupMovingHeadRgbs, LightsGroupPars } from '../../entities';
import { RgbColor } from '../../color-definitions';
import LightsFixture from '../../entities/lights-fixture';

export interface WaveProps {
  /**
   * Color of the lights
   */
  color: RgbColor;

  /**
   * Number of waves, ignored if singleWave=true (1 by default)
   * @isInt
   * @minimum 1
   */
  nrWaves?: number;

  /**
   * How many ms each cycle of the wave takes (1000ms by default)
   * @isInt
   * @minimum 0
   */
  cycleTime?: number;

  /**
   * Whether the animation should only be executed once from start to finish
   * instead of a continuous animation (false by default)
   */
  singleWave?: boolean;
}

export type WaveCreateParams = BaseLightsEffectCreateParams & {
  type: 'Wave';
  props: WaveProps;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_NR_WAVES = 2;
const DEFAULT_CYCLE_TIME = 2000;

export default class Wave extends LightsEffect<WaveProps> {
  private cycleStartTick: Date = new Date();

  constructor(lightsGroup: LightsGroup, props: WaveProps) {
    super(lightsGroup);
    this.props = props;
  }

  public static build(props: WaveProps): LightsEffectBuilder<WaveProps, Wave> {
    return (lightsGroup) => new Wave(lightsGroup, props);
  }

  destroy(): void {}

  beat(): void {}

  /**
   * Get progression of the complete animation (in the range [0, 1])
   * @param currentTick
   * @private
   */
  private getProgression(currentTick: Date) {
    const cycleTime = this.props.cycleTime ?? DEFAULT_CYCLE_TIME;
    return Math.min(1, (currentTick.getTime() - this.cycleStartTick.getTime()) / cycleTime);
  }

  /**
   * Get the relative progression of an individual fixture. The fixture at the start of the chain
   * will be in range [0, 2]; the fixture at the end in range [-1, 1]; all other fixtures have a
   * range relatively between those two ranges.
   * @private
   */
  private getRelativeProgression(absoluteProgression: number, fixtureIndex: number) {
    const nrLights = this.lightsGroup.pars.length + this.lightsGroup.movingHeadRgbs.length;
    return fixtureIndex / nrLights - 1 + 2 * absoluteProgression;
  }

  /**
   * Get a fixture's brightness level
   * @private
   * @param relativeProgression
   */
  private getBrightness(relativeProgression: number) {
    // If we only show a single wave, we want it to be visible. So, by trial and error a size of
    // 1.5 fits best. This works, because the singleWave prop
    const nrWaves = this.props.singleWave ? 1.5 : (this.props.nrWaves ?? DEFAULT_NR_WAVES);

    // If we are outside the first half sine wave, we set some bounds.
    if (this.props.singleWave && relativeProgression < 0) return 0;
    if (this.props.singleWave && relativeProgression > 1) return 0;

    return Math.sin(relativeProgression * nrWaves * Math.PI);
  }

  tick(): LightsGroup {
    const currentTick = new Date();
    const progression = this.getProgression(currentTick);
    if (progression >= 1 && !this.props.singleWave) {
      this.cycleStartTick = currentTick;
    }

    // Apply the wave effect to the fixture in a group
    const apply = (p: LightsGroupPars | LightsGroupMovingHeadRgbs, i: number) => {
      const relativeProgression = this.getRelativeProgression(progression, i);
      const brightness = this.getBrightness(relativeProgression);
      p.fixture.setMasterDimmer(Math.max(0, brightness * 255));
      p.fixture.setColor(this.props.color);
    };

    this.lightsGroup.pars.sort((p1, p2) => p2.firstChannel - p1.firstChannel).forEach(apply);
    this.lightsGroup.movingHeadRgbs
      .sort((p1, p2) => p2.firstChannel - p1.firstChannel)
      .forEach(apply);

    return this.lightsGroup;
  }
}
