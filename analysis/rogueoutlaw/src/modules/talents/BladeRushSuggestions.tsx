import { t } from '@lingui/macro';
import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { NumberThreshold, ThresholdStyle, When } from 'parser/core/ParseResults';
import React from 'react';

class BladeRushSuggestions {
  protected percentTimeOffCdAoe: number;
  protected percentTimeOffCdST: number;
  protected energyThreshold: number;

  constructor(percentTimeOffCdAoe: number, percentTimeOffCdST: number, energyThreshold: number) {
    this.percentTimeOffCdAoe = percentTimeOffCdAoe;
    this.percentTimeOffCdST = percentTimeOffCdST;
    this.energyThreshold = energyThreshold;
  }

  get thresholdsAoe(): NumberThreshold {
    return {
      actual: this.percentTimeOffCdAoe,
      isGreaterThan: {
        major: 0.25,
        average: 0.2,
        minor: 0.1,
      },
      style: ThresholdStyle.PERCENTAGE,
    };
  }

  get castOffCdInAoe(): JSX.Element {
    return (
      <>
        You should try to cast <SpellLink id={SPELLS.BLADE_RUSH_TALENT.id} /> more often in fights
        with multiple targets. You should hold onto <SpellLink id={SPELLS.BLADE_RUSH_TALENT.id} />{' '}
        in AoE scenarios only if you're waiting for <SpellLink id={SPELLS.BLADE_FLURRY.id} /> to
        come off cooldown in the next few seconds.
      </>
    );
  }

  maybeGiveSuggestionAoe(when: When) {
    when(this.thresholdsAoe)
      .isGreaterThan(this.thresholdsAoe.isGreaterThan!)
      .addSuggestion((suggest, actual, recommended) =>
        suggest(this.castOffCdInAoe)
          .icon(SPELLS.BLADE_RUSH_TALENT.icon)
          .actual(
            t({
              id: 'rogue.outlaw.suggestions.bladerush.timeoffCD',
              message: `${formatPercentage(actual)}% time spent on cd`,
            }),
          )
          .recommended(`<${formatPercentage(recommended)}% is recommended`),
      );
  }
  get thresholdsST(): NumberThreshold {
    return {
      actual: this.percentTimeOffCdST,
      isGreaterThan: {
        major: 0.25,
        average: 0.2,
        minor: 0.1,
      },
      style: ThresholdStyle.PERCENTAGE,
    };
  }

  get castOffCdInST(): JSX.Element {
    return (
      <>
        You should try to cast <SpellLink id={SPELLS.BLADE_RUSH_TALENT.id} /> more often on low
        Energy. If you current energy is less than {this.energyThreshold} and
        <SpellLink id={SPELLS.BLADE_RUSH_TALENT.id} /> is off cooldown you should cast it.
      </>
    );
  }

  maybeGiveSuggestionST(when: When) {
    when(this.thresholdsST)
      .isGreaterThan(this.thresholdsST.isGreaterThan!)
      .addSuggestion((suggest, actual, recommended) =>
        suggest(this.castOffCdInST)
          .icon(SPELLS.BLADE_RUSH_TALENT.icon)
          .actual(
            t({
              id: 'rogue.outlaw.suggestions.bladerush.timeoffCD',
              message: `${formatPercentage(actual)}% time spent off cooldown while below ${
                this.energyThreshold
              } Energy`,
            }),
          )
          .recommended(`<${formatPercentage(recommended)}% is recommended`),
      );
  }
}

export default BladeRushSuggestions;
