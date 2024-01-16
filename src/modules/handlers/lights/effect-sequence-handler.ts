import BaseLightsHandler from '../base-lights-handler';
import { BeatEvent, TrackChangeEvent } from '../../events/music-emitter-events';
import { LightsGroup } from '../../lights/entities';
import { LightsPredefinedEffect } from '../../lights/entities/sequences/lights-predefined-effect';
import LightsEffect from '../../lights/effects/lights-effect';
import dataSource from '../../../database';
import { LIGHTS_EFFECTS } from '../../lights/effects';
import { MusicEmitter } from '../../events';

interface LightsGroupEffectBase {
  startMs: number;
  durationMs: number;
  endMs: number;
  id: number;
}

interface ActiveLightsGroupEffect extends LightsGroupEffectBase {
  effect: LightsEffect;
}

interface LightsGroupEffect extends LightsGroupEffectBase {
  lightsGroupIds: number[];
  effectName: string;
  effectProps: any;
}

interface PlannedLightsGroupEffect extends LightsGroupEffect {
  timeout?: NodeJS.Timeout;
}

export default class EffectSequenceHandler extends BaseLightsHandler {
  private sequence: LightsPredefinedEffect[] = [];

  private sequenceStart: Date;

  private activeEffects: ActiveLightsGroupEffect[] = [];

  private events: PlannedLightsGroupEffect[] = [];

  constructor(musicEmitter: MusicEmitter) {
    super();
    musicEmitter.on('stop', this.stopAudio.bind(this));
  }

  /**
   * Given a sequence of effects and the track start time,
   * register all effect changes as NodeJS Timeouts
   * @param sequence
   * @param startTime
   * @private
   */
  private setSequence(sequence: LightsPredefinedEffect[], startTime: Date) {
    this.sequence = sequence;
    this.sequenceStart = startTime;

    const now = new Date();
    const progression = now.getTime() - startTime.getTime();

    const timestamps = Array.from(new Set(sequence.map((s) => s.timestamp))).sort();

    this.events = timestamps.map((timestamp): PlannedLightsGroupEffect[] => {
      const predefinedEffects = sequence.filter((s) => s.timestamp === timestamp);
      return predefinedEffects.map((e): PlannedLightsGroupEffect | undefined => {
        const endMs = e.timestamp + e.duration;
        if (endMs <= progression) return undefined;
        const effect: LightsGroupEffect = ({
          startMs: e.timestamp,
          durationMs: e.duration,
          endMs: e.timestamp + e.duration,
          effectName: e.effect,
          effectProps: JSON.parse(e.effectProps),
          lightsGroupIds: e.lightGroups.map((l) => l.id),
          id: e.id,
        });
        return {
          ...effect,
          timeout: effect.startMs > progression
            ? setTimeout(this.startEffect.bind(this), e.timestamp - progression, effect)
            : undefined,
        };
      }).filter((e) => e !== undefined)
        .map((e) => e!);
    }).flat();

    const currentlyActiveEffects = this.events
      .filter((e) => e.startMs < progression && e.endMs > progression);
    currentlyActiveEffects.forEach((e) => this.startEffect(e));

    return this.events;
  }

  /**
   * Start the given (planned) effect
   * @param effectToActivate
   * @private
   */
  private startEffect(effectToActivate: LightsGroupEffect) {
    // Get the light groups this effect should apply to
    const lightsGroups = this.entities
      .filter((e) => effectToActivate.lightsGroupIds.includes(e.id));

    const effects = LIGHTS_EFFECTS.map((EFFECT) => {
      if (EFFECT.name === effectToActivate.effectName) {
        return lightsGroups.map((g) => new EFFECT(g, effectToActivate.effectProps));
      }
      return undefined;
    }).filter((e) => e !== undefined)
      .map((e) => e!)
      .flat();

    const activeEffects: ActiveLightsGroupEffect[] = effects.map((effect) => ({
      effect,
      startMs: effectToActivate.startMs,
      durationMs: effectToActivate.durationMs,
      endMs: effectToActivate.endMs,
      id: effectToActivate.id,
    }));

    this.activeEffects.push(...activeEffects);
  }

  /**
   * Stop or pause audio playback and thus the effects changing
   * We do not need to pause any effects, because the effects
   * should do that themselves when they do not receive any beats/ticks
   * @private
   */
  private stopSequence(blackout = false) {
    this.events.forEach((e) => {
      clearTimeout(e.timeout);
    });
    if (blackout) this.activeEffects.forEach((e) => e.effect.lightsGroup.blackout());
    this.activeEffects = [];
  }

  /**
   * Propagate the track's beat to all active effects
   * @param event
   */
  beat(event: BeatEvent): void {
    console.log(this.activeEffects);
    this.activeEffects.forEach(({ effect }) => effect.beat(event));
  }

  /**
   * Handle the event loop tick.
   * Before calculating the new state of all the effects, stop/remove any
   * effects that have been expired (i.e. whose duration is over).
   * Then, blackout all the corresponding lightgroups as well.
   * If the predefined sequence of effects is configured correctly, a new
   * effect should take their place (so a blackout should not actually turn
   * off all the lights, but should remove any artifacts)
   */
  tick(): LightsGroup[] {
    // Remove any expired events
    const songProgression = new Date().getTime() - (this.sequenceStart?.getTime() ?? 0);
    const expiredEffects = this.activeEffects.filter((e) => e.endMs <= songProgression);
    if (expiredEffects.length > 0) {
      console.log('break');
    }
    // blackout the lights to prevent the lights from staying on afterwards
    expiredEffects.forEach((e) => e.effect.lightsGroup.blackout());
    const expiredEffectIndices = expiredEffects.map((e) => e.id);
    this.activeEffects = this.activeEffects.filter((e) => !expiredEffectIndices.includes(e.id));

    this.activeEffects.forEach(({ effect }) => effect.tick());
    return this.entities;
  }

  /**
   * Handle a change of the currently playing track
   * @param event
   */
  changeTrack([event]: TrackChangeEvent[]): void {
    console.log(this.entities.length);
    if (this.entities.length === 0) return;

    this.stopSequence(true);

    dataSource.getRepository(LightsPredefinedEffect).find({
      where: { trackUri: event.trackURI },
      relations: { lightGroups: true },
    })
      .then((sequence) => {
        this.setSequence(sequence, event.startTime);
      })
      .catch((e) => console.error(e));
  }

  /**
   * Handle stopping playing audio
   */
  stopAudio(): void {
    this.stopSequence(false);
  }

  /**
   * Override removeEntity function to stop the sequence when no entities are left
   * @param entity
   */
  removeEntity(entity: LightsGroup) {
    super.removeEntity(entity);

    if (this.entities.length === 0) {
      this.stopSequence();
    }
  }
}