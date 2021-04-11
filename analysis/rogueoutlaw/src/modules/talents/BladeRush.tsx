import SPELLS from 'common/SPELLS';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { EventType, UpdateSpellUsableEvent } from 'parser/core/Events';
import { When } from 'parser/core/ParseResults';
import Enemies from 'parser/shared/modules/Enemies';

import { EnergyTracker } from '@wowanalyzer/rogue';

import BladeRushSuggestions from './BladeRushSuggestions';

class BladeRushDelayedCast {
  timestamp!: number;
  timeOffCd!: number;

  constructor(timestamp: number, timeOffCd: number) {
    this.timestamp = timestamp;
    this.timeOffCd = timeOffCd;
  }
}

export const ENERGY_THRESHOLD = 70;

class BladeRush extends Analyzer {
  static dependencies = {
    enemies: Enemies,
    energyTracker: EnergyTracker,
  };

  protected enemies!: Enemies;
  protected energyTracker!: EnergyTracker;
  protected bladeRushLowEnergyCasts: BladeRushDelayedCast[] = [];
  protected bladeRushAllCasts: BladeRushDelayedCast[] = [];
  protected offCdTimestamp: number = 0;
  protected isFirstCast: boolean = true;
  foo = 60;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(SPELLS.BLADE_RUSH_TALENT.id);
    this.addEventListener(
      Events.UpdateSpellUsable.by(SELECTED_PLAYER).spell(SPELLS.BLADE_RUSH_TALENT),
      this.onBladeRushUsable,
    );
  }

  isSingleTargetFight(): boolean {
    return Object.values(this.enemies.getEntities()).length === 1;
  }

  updateCooldownTrackers(event: UpdateSpellUsableEvent) {
    const timeOffCd = event.timestamp - this.offCdTimestamp;
    if (this.energyTracker.current < ENERGY_THRESHOLD) {
      this.bladeRushLowEnergyCasts.push(new BladeRushDelayedCast(event.timestamp, timeOffCd));
    }
    this.bladeRushAllCasts.push(new BladeRushDelayedCast(event.timestamp, timeOffCd));
  }

  onBladeRushUsable(event: UpdateSpellUsableEvent) {
    switch (event.trigger) {
      case EventType.BeginCooldown: {
        if (!this.isFirstCast) {
          this.updateCooldownTrackers(event);
        } else {
          this.isFirstCast = false;
        }
        break;
      }
      case EventType.EndCooldown: {
        this.offCdTimestamp = event.timestamp;
        break;
      }
    }
  }

  totalTimeOffCd(bladeRushDelayedCasts: BladeRushDelayedCast[]): number {
    let timeOffCd = 0;
    bladeRushDelayedCasts.forEach(
      (BladeRushDelayedCast) => (timeOffCd += BladeRushDelayedCast.timeOffCd),
    );
    return timeOffCd;
  }

  get percentTimeOffCdAoe(): number {
    if (this.isSingleTargetFight()) {
      return 0;
    }
    return this.totalTimeOffCd(this.bladeRushAllCasts) / this.owner.fightDuration;
  }

  get percentTimeOffCdST(): number {
    if (!this.isSingleTargetFight()) {
      return 0;
    }
    return this.totalTimeOffCd(this.bladeRushLowEnergyCasts) / this.owner.fightDuration;
  }

  suggestions(when: When) {
    const bladeRushSuggestions = new BladeRushSuggestions(
      this.percentTimeOffCdAoe,
      this.percentTimeOffCdST,
      ENERGY_THRESHOLD,
    );
    bladeRushSuggestions.maybeGiveSuggestionAoe(when);
    bladeRushSuggestions.maybeGiveSuggestionST(when);
  }
}

export default BladeRush;
