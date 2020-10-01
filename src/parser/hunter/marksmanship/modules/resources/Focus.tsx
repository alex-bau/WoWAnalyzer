import React from 'react';

import Analyzer from 'parser/core/Analyzer';
import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import resourceSuggest from 'parser/shared/modules/resources/resourcetracker/ResourceSuggest';
import FocusTracker from 'parser/hunter/shared/modules/resources/FocusTracker';

class Focus extends Analyzer {
  static dependencies = {
    focusTracker: FocusTracker,
  };

  protected focusTracker!: FocusTracker;

  suggestions(when: any) {
    const mmFocusExtraSuggestion = <>Try to keep focus below max by using <SpellLink id={SPELLS.AIMED_SHOT.id} />, {this.selectedCombatant.hasTalent(SPELLS.CHIMAERA_SHOT_MM_TALENT.id) ? <SpellLink id={SPELLS.CHIMAERA_SHOT_MM_TALENT.id} /> : <SpellLink id={SPELLS.ARCANE_SHOT.id} />} and <SpellLink id={SPELLS.MULTISHOT_MM.id} />.</>;
    resourceSuggest(when, this.focusTracker, {
      spell: SPELLS.STEADY_SHOT_FOCUS,
      minor: 0.025,
      avg: 0.05,
      major: 0.1,
      extraSuggestion: mmFocusExtraSuggestion,
    });
    resourceSuggest(when, this.focusTracker, {
      spell: SPELLS.RAPID_FIRE_FOCUS,
      minor: 0.025,
      avg: 0.05,
      major: 0.1,
      extraSuggestion: mmFocusExtraSuggestion,
    });
    resourceSuggest(when, this.focusTracker, {
      spell: SPELLS.FOCUSED_FIRE_FOCUS,
      minor: 0.025,
      avg: 0.05,
      major: 0.1,
      extraSuggestion: mmFocusExtraSuggestion,
    });
  }
}

export default Focus;
