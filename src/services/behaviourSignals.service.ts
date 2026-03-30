import type { BehaviourData } from '../types/assessment.types.js';
import type { BehaviourSignals } from '../types/signals.types.js';

export class BehaviourSignalsService {
  analyze(behaviour: BehaviourData): BehaviourSignals {
    const humanTiming = this.isHumanTiming(behaviour.time_to_complete_seconds);
    
    const scoreContribution = this.calculateScore({
      timeToComplete: behaviour.time_to_complete_seconds,
      hasMouseMovements: behaviour.mouse_movements,
      hasKeyboardEvents: behaviour.keyboard_events,
      hasCopyPaste: behaviour.copy_paste_detected,
      hasScrollEvents: behaviour.scroll_events > 0
    });

    return {
      score_contribution: scoreContribution,
      time_to_complete_seconds: behaviour.time_to_complete_seconds,
      human_timing: humanTiming,
      mouse_movements_detected: behaviour.mouse_movements,
      keyboard_events_detected: behaviour.keyboard_events
    };
  }

  private isHumanTiming(timeInSeconds: number): boolean {
    return timeInSeconds >= 8 && timeInSeconds <= 120;
  }

  private calculateScore(params: {
    timeToComplete: number;
    hasMouseMovements: boolean;
    hasKeyboardEvents: boolean;
    hasCopyPaste: boolean;
    hasScrollEvents: boolean;
  }): number {
    let score = 0;

    if (params.timeToComplete < 3) score -= 12;
    else if (params.timeToComplete < 8) score -= 5;
    else if (params.timeToComplete >= 15 && params.timeToComplete <= 120) score += 8;

    if (!params.hasMouseMovements && !params.hasKeyboardEvents) score -= 10;
    if (params.hasCopyPaste) score -= 8;
    if (params.hasScrollEvents) score += 3;

    return score;
  }
}