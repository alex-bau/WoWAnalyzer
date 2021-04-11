import { t } from '@lingui/macro';
import HitCountAoe from 'common/HitCountAoe';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { Options } from 'parser/core/Analyzer';
import { NumberThreshold, ThresholdStyle, When } from 'parser/core/ParseResults';
import { STATISTIC_ORDER } from 'parser/ui/StatisticBox';
import React from 'react';

/**
 * Even with its DoT, thrash shouldn't be used against a single target
 */
class ThrashHitCount extends HitCountAoe {
  constructor(options: Options) {
    super(options, SPELLS.THRASH_FERAL);
  }

  get hitNoneThresholds(): NumberThreshold {
    return {
      actual: this.hitZeroPerMinute,
      isGreaterThan: {
        minor: 0,
        average: 0.2,
        major: 0.5,
      },
      style: ThresholdStyle.NUMBER,
    };
  }

  get hitJustOneThresholds(): NumberThreshold {
    return {
      actual: this.hitJustOnePerMinute,
      isGreaterThan: {
        minor: 0,
        average: 0.5,
        major: 3.0,
      },
      style: ThresholdStyle.NUMBER,
    };
  }

  static spell = SPELLS.THRASH_FERAL;

  statistic() {
    return this.generateStatistic(STATISTIC_ORDER.OPTIONAL(11));
  }

  suggestions(when: When) {
    when(this.hitNoneThresholds).addSuggestion((suggest, actual, recommended) =>
      suggest(
        <>
          You are using <SpellLink id={SPELLS.THRASH_FERAL.id} /> out of range of any targets. Try
          to get familiar with the range of your area of effect abilities so you can avoid wasting
          energy when they'll not hit anything.
        </>,
      )
        .icon(SPELLS.THRASH_FERAL.icon)
        .actual(
          t({
            id: 'druid.feral.suggestions.thrash.hitcount.outOfRange',
            message: `${actual.toFixed(1)} uses per minute that hit nothing.`,
          }),
        )
        .recommended(`${recommended} is recommended`),
    );
  }
}

export default ThrashHitCount;
