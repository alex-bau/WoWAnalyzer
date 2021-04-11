import HitCountAoe, { FinalizedCast } from 'common/HitCountAoe';
import SPELLS from 'common/SPELLS';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, {
  CastEvent,
  DamageEvent,
  EventType,
  UpdateSpellUsableEvent,
} from 'parser/core/Events';
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

class FightSegment {
  startTimestamp!: number;
  endTimestamp!: number;

  constructor(startTimestamp: number, endTimestamp: number) {
    this.startTimestamp = startTimestamp;
    this.endTimestamp = endTimestamp;
  }

  get duration(): number {
    return this.endTimestamp - this.startTimestamp;
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
  protected bladeFlurryHitCount: HitCountAoe;
  protected bladeRushLowEnergyCasts: BladeRushDelayedCast[] = [];
  protected bladeRushAllCasts: BladeRushDelayedCast[] = [];
  protected offCdTimestamp: number = 0;
  protected isFirstCast: boolean = true;
  protected bladeRushOffCd: boolean = false;
  protected isDelayedLowEnergyBladeRushCast: boolean = false;
  protected stSegments: FightSegment[] = [];
  protected aoeSegments: FightSegment[] = [];
  protected bladeRushBadSTSegments: FightSegment[] = [];
  protected bladeRushBadAoeSegments: FightSegment[] = [];
  timeOffCdST = 0;
  timeOffCdAoe = 0;
  foo = 60;

  constructor(options: Options) {
    super(options);
    this.bladeFlurryHitCount = new HitCountAoe(options, SPELLS.BLADE_FLURRY);
    this.active = this.selectedCombatant.hasTalent(SPELLS.BLADE_RUSH_TALENT.id);
    this.addEventListener(
      Events.UpdateSpellUsable.by(SELECTED_PLAYER).spell(SPELLS.BLADE_RUSH_TALENT),
      this.onBladeRushUsable,
    );
    this.addEventListener(Events.cast.by(SELECTED_PLAYER), this.onCast);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER), this.onDamage);
  }

  isSingleTargetFight(): boolean {
    return Object.values(this.enemies.getEntities()).length === 1;
  }

  updateCooldownTrackers(event: UpdateSpellUsableEvent) {
    const timeOffCd = event.timestamp - this.offCdTimestamp;
    if (this.isDelayedLowEnergyBladeRushCast) {
      this.bladeRushLowEnergyCasts.push(new BladeRushDelayedCast(event.timestamp, timeOffCd));
    }
    this.bladeRushAllCasts.push(new BladeRushDelayedCast(event.timestamp, timeOffCd));
  }

  onBladeRushUsable(event: UpdateSpellUsableEvent) {
    switch (event.trigger) {
      case EventType.BeginCooldown: {
        if (!this.isFirstCast) {
          this.updateCooldownTrackers(event);
          this.bladeRushOffCd = false;
        } else {
          this.isFirstCast = false;
        }
        break;
      }
      case EventType.EndCooldown: {
        this.offCdTimestamp = event.timestamp;
        this.bladeRushOffCd = true;
        break;
      }
    }
  }

  onCast(event: CastEvent) {
    this.maybeMarkCurrentBladeRushCastBad();
    const finalizedCast = this.bladeFlurryHitCount.updateCastTrackers(event);
    if (finalizedCast.event) {
      const fightSegment = new FightSegment(finalizedCast.event.timestamp, event.timestamp);
      this.updateFightSegments(fightSegment, finalizedCast);
    }
  }

  onDamage(event: DamageEvent) {
    this.bladeFlurryHitCount.updateHitTrackers(event);
  }

  maybeMarkCurrentBladeRushCastBad() {
    if (this.energyTracker.current < ENERGY_THRESHOLD && this.bladeRushOffCd) {
      this.isDelayedLowEnergyBladeRushCast = true;
    }
  }

  maybeUpdateBadSegments(fightSegments: FightSegment[], fightSegment: FightSegment) {
    if (!this.bladeRushOffCd) {
      return null;
    }
    fightSegments.push(fightSegment);
  }

  updateFightSegments(fightSegment: FightSegment, finalizedCast: FinalizedCast) {
    if (finalizedCast.isSingleTarget) {
      this.maybeUpdateBadSegments(this.bladeRushBadSTSegments, fightSegment);
      this.stSegments.push(fightSegment);
    } else {
      this.maybeUpdateBadSegments(this.bladeRushBadAoeSegments, fightSegment);
      this.aoeSegments.push(fightSegment);
    }
  }

  totalTimeOffCd(bladeRushDelayedCasts: BladeRushDelayedCast[]): number {
    let timeOffCd = 0;
    bladeRushDelayedCasts.forEach(
      (BladeRushDelayedCast) => (timeOffCd += BladeRushDelayedCast.timeOffCd),
    );
    return timeOffCd;
  }

  fightTypeDuration(fightSegments: FightSegment[]): number {
    if (fightSegments.length === 0) {
      return this.owner.fightDuration;
    }
    let segmentDuration = 0;
    fightSegments.forEach((fightSegment) => (segmentDuration += fightSegment.duration));
    return segmentDuration;
  }

  get percentTimeOffCdAoe(): number {
    if (this.isSingleTargetFight()) {
      return 0;
    }
    return this.totalTimeOffCd(this.bladeRushAllCasts) / this.fightTypeDuration(this.aoeSegments);
  }

  get percentTimeOffCdST(): number {
    if (!this.isSingleTargetFight()) {
      return 0;
    }
    return (
      this.totalTimeOffCd(this.bladeRushLowEnergyCasts) / this.fightTypeDuration(this.stSegments)
    );
  }

  suggestions(when: When) {
    const bladeRushSuggestions = new BladeRushSuggestions(
      this.percentTimeOffCdAoe,
      this.percentTimeOffCdST,
      ENERGY_THRESHOLD,
    );
    this.timeOffCdAoe = this.fightTypeDuration(this.bladeRushBadAoeSegments);
    this.timeOffCdST = this.fightTypeDuration(this.bladeRushBadSTSegments);
    console.log(
      'Total duration ' +
        this.owner.fightDuration +
        ' ST Duration ' +
        this.fightTypeDuration(this.stSegments) +
        ' Aoe Duration ' +
        this.fightTypeDuration(this.aoeSegments) +
        ' Sum ' +
        (this.fightTypeDuration(this.stSegments) + this.fightTypeDuration(this.aoeSegments)),
    );
    console.log(
      'Ration ' +
        (this.fightTypeDuration(this.stSegments) + this.fightTypeDuration(this.aoeSegments)) /
          this.owner.fightDuration,
    );
    console.log(
      ' Off CD St ' +
        this.timeOffCdST +
        ' Off CD Aoe ' +
        this.timeOffCdAoe +
        ' Sum Off Cd ' +
        (this.timeOffCdST + this.timeOffCdAoe) +
        ' Total off Cd ' +
        this.totalTimeOffCd(this.bladeRushLowEnergyCasts),
    );
    console.log(
      ' Ratio ' +
        (this.timeOffCdST + this.timeOffCdAoe) / this.totalTimeOffCd(this.bladeRushAllCasts),
    );
    console.log('Avg targets hit ' + this.bladeFlurryHitCount.averageTargetsHit);
    console.log(this.enemies.getEntities());
    bladeRushSuggestions.maybeGiveSuggestionAoe(when);
    bladeRushSuggestions.maybeGiveSuggestionST(when);
  }
}

export default BladeRush;
