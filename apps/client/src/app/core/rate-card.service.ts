import { Injectable, inject } from '@angular/core';
import { Api } from './api';

export interface SeasonRow {
  readonly seasonId: string;
  readonly villaId: string;
  readonly from: string;
  readonly to: string;
  readonly weeklyAmount: number;
}

/**
 * The owner's rate card: one seasonal price per period of days. The card
 * lives on the API (event-sourced); this service is the owner console's
 * thin typed client.
 */
@Injectable({ providedIn: 'root' })
export class RateCardService {
  readonly #api = inject(Api);

  seasons(villaId: string): Promise<{ items: SeasonRow[] }> {
    return this.#api.get<{ items: SeasonRow[] }>(
      `/pricing/seasons?villaId=${encodeURIComponent(villaId)}`,
    );
  }

  defineSeason(input: {
    villaId: string;
    from: string;
    to: string;
    weeklyAmount: number;
  }): Promise<SeasonRow> {
    return this.#api.post('/pricing/seasons', input);
  }

  removeSeason(villaId: string, seasonId: string): Promise<{ villaId: string; seasonId: string }> {
    return this.#api.post('/pricing/seasons/removal', { villaId, seasonId });
  }
}
