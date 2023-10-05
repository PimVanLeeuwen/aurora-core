import {
  Column, Entity, JoinColumn, ManyToOne,
} from 'typeorm';
import BaseEntity from '../base-entity';
// eslint-disable-next-line import/no-cycle
import LightsGroup from './lights-group';
import LightsPar from './lights-par';

@Entity()
export default class LightsGroupPars extends BaseEntity {
  @ManyToOne(() => LightsGroup, (group) => group.pars)
  @JoinColumn()
  public lightsGroup: LightsGroup;

  @ManyToOne(() => LightsPar)
  @JoinColumn()
  public par: LightsPar;

  @Column({ type: 'smallint', unsigned: true })
  public firstChannel: number;
}
