import { t } from '@lingui/macro';
import HitCountAoe from 'common/HitCountAoe';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { Options } from 'parser/core/Analyzer';
import { NumberThreshold, ThresholdStyle, When } from 'parser/core/ParseResults';
import { STATISTIC_ORDER } from 'parser/ui/StatisticBox';
import React from 'react';

/**
 * Despite being an AoE ability Brutal Slash is usually the best talent on its row for single target fights.
 * It can be useful to count how many targets it hits, but hitting just one is not a mistake.
 */
class BrutalSlashHitCount extends HitCountAoe {
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

  static spell = SPELLS.BRUTAL_SLASH_TALENT;

  constructor(options: Options) {
    super(options, SPELLS.BRUTAL_SLASH_TALENT);
    this.active = this.selectedCombatant.hasTalent(SPELLS.BRUTAL_SLASH_TALENT.id);
  }

  statistic() {
    return this.generateStatistic(STATISTIC_ORDER.OPTIONAL(10));
  }

  suggestions(when: When) {
    when(this.hitNoneThresholds).addSuggestion((suggest, actual, recommended) =>
      suggest(
        <>
          You are using <SpellLink id={SPELLS.BRUTAL_SLASH_TALENT.id} /> out of range of any
          targets. Try to get familiar with the range of your area of effect abilities so you can
          avoid wasting charges and energy when they'll not hit anything.
        </>,
      )
        .icon(SPELLS.BRUTAL_SLASH_TALENT.icon)
        .actual(
          t({
            id: 'druid.feral.suggestions.brutalSlash.hitcount.outOfRange',
            message: `${actual.toFixed(1)} uses per minute that hit nothing.`,
          }),
        )
        .recommended(`${recommended} is recommended`),
    );
  }
}

export default BrutalSlashHitCount;
