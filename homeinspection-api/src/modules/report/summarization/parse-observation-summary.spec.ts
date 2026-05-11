import { SummarizationProviderError } from './ai-summarizer.port';
import { parseObservationSummaryFromAssistantText } from './parse-observation-summary';

describe('parseObservationSummaryFromAssistantText', () => {
  const valid = {
    executiveSummary: 'Roof issues dominate the supplied notes.',
    prioritizedItems: [
      {
        rank: 1,
        title: 'Roof damage',
        rationale: 'Missing shingles were called out in the observations.',
      },
      {
        rank: 2,
        title: 'Follow up',
        rationale: 'Confirm repairs with a licensed roofer.',
      },
    ],
  };

  it('parses bare JSON', () => {
    expect(
      parseObservationSummaryFromAssistantText(JSON.stringify(valid)),
    ).toEqual(valid);
  });

  it('parses JSON wrapped in a markdown code fence', () => {
    const fenced = `\`\`\`json\n${JSON.stringify(valid, null, 2)}\n\`\`\``;
    expect(parseObservationSummaryFromAssistantText(fenced)).toEqual(valid);
  });

  it('parses JSON preceded by short prose (common LLM drift)', () => {
    const inner = JSON.stringify(valid);
    const wrapped = `Here is the structured output:\n\n${inner}\n\nHope this helps.`;
    expect(parseObservationSummaryFromAssistantText(wrapped)).toEqual(valid);
  });

  it('accepts string ranks that are decimal integer strings', () => {
    const withStringRanks = {
      executiveSummary: valid.executiveSummary,
      prioritizedItems: valid.prioritizedItems.map((item) => ({
        ...item,
        rank: String(item.rank) as unknown as number,
      })),
    };
    expect(
      parseObservationSummaryFromAssistantText(JSON.stringify(withStringRanks)),
    ).toEqual(valid);
  });

  it('sorts prioritizedItems by ascending rank regardless of input order', () => {
    const outOfOrder = {
      executiveSummary: 'Two items, ranks reversed in array.',
      prioritizedItems: [
        {
          rank: 2,
          title: 'Second priority',
          rationale: 'Comes second.',
        },
        {
          rank: 1,
          title: 'First priority',
          rationale: 'Comes first.',
        },
      ],
    };
    const expected = {
      executiveSummary: outOfOrder.executiveSummary,
      prioritizedItems: [
        outOfOrder.prioritizedItems[1],
        outOfOrder.prioritizedItems[0],
      ],
    };
    expect(
      parseObservationSummaryFromAssistantText(JSON.stringify(outOfOrder)),
    ).toEqual(expected);
  });

  it('accepts empty prioritizedItems when summary is present', () => {
    const minimal = {
      executiveSummary: 'No observations were supplied.',
      prioritizedItems: [],
    };
    expect(
      parseObservationSummaryFromAssistantText(JSON.stringify(minimal)),
    ).toEqual(minimal);
  });

  it('defaults missing or null prioritizedItems to an empty array', () => {
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({ executiveSummary: 'Summary only.' }),
      ),
    ).toEqual({
      executiveSummary: 'Summary only.',
      prioritizedItems: [],
    });
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'Summary only.',
          prioritizedItems: null,
        }),
      ),
    ).toEqual({
      executiveSummary: 'Summary only.',
      prioritizedItems: [],
    });
  });

  it('parses double-encoded JSON (string containing JSON)', () => {
    const inner = JSON.stringify(valid);
    const outer = JSON.stringify(inner);
    expect(parseObservationSummaryFromAssistantText(outer)).toEqual(valid);
  });

  it('accepts trailing commas in objects and arrays', () => {
    const loose = `{
      "executiveSummary": "Summary text",
      "prioritizedItems": [
        { "rank": 1, "title": "T", "rationale": "R", },
      ],
    }`;
    expect(parseObservationSummaryFromAssistantText(loose)).toEqual({
      executiveSummary: 'Summary text',
      prioritizedItems: [{ rank: 1, title: 'T', rationale: 'R' }],
    });
  });

  it('coerces numeric executiveSummary to string', () => {
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 404,
          prioritizedItems: [],
        }),
      ),
    ).toEqual({
      executiveSummary: '404',
      prioritizedItems: [],
    });
  });

  it('coerces numeric title and rationale to strings', () => {
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'ok',
          prioritizedItems: [{ rank: 1, title: 10, rationale: 20 }],
        }),
      ),
    ).toEqual({
      executiveSummary: 'ok',
      prioritizedItems: [{ rank: 1, title: '10', rationale: '20' }],
    });
  });

  it('strips think/reasoning wrappers before JSON', () => {
    const inner = JSON.stringify(valid);
    const wrapped = `\x3c\x74\x68\x69\x6e\x6b\x3eworking\x3c/\x74\x68\x69\x6e\x6b\x3e${inner}`;
    expect(parseObservationSummaryFromAssistantText(wrapped)).toEqual(valid);
  });

  it('accepts a one-element array root', () => {
    expect(
      parseObservationSummaryFromAssistantText(JSON.stringify([valid])),
    ).toEqual(valid);
  });

  it('accepts PascalCase / snake_case summary keys', () => {
    const body = {
      ExecutiveSummary: 'Pascal exec.',
      PrioritizedItems: [{ rank: 1, title: 'A', rationale: 'B' }],
    };
    expect(
      parseObservationSummaryFromAssistantText(JSON.stringify(body)),
    ).toEqual({
      executiveSummary: 'Pascal exec.',
      prioritizedItems: [{ rank: 1, title: 'A', rationale: 'B' }],
    });
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executive_summary: 'Snake exec.',
          prioritized_items: [],
        }),
      ),
    ).toEqual({
      executiveSummary: 'Snake exec.',
      prioritizedItems: [],
    });
  });

  it('accepts a single prioritizedItems object as one row', () => {
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'One row.',
          prioritizedItems: {
            rank: 2,
            title: 'Only item',
            rationale: 'Details.',
          },
        }),
      ),
    ).toEqual({
      executiveSummary: 'One row.',
      prioritizedItems: [
        { rank: 1, title: 'Only item', rationale: 'Details.' },
      ],
    });
  });

  it('rejects invalid JSON', () => {
    expect(() => parseObservationSummaryFromAssistantText('not json')).toThrow(
      SummarizationProviderError,
    );
  });

  it('rejects non-object root', () => {
    expect(() => parseObservationSummaryFromAssistantText('"hello"')).toThrow(
      SummarizationProviderError,
    );
  });

  it('rejects missing executiveSummary', () => {
    expect(() =>
      parseObservationSummaryFromAssistantText(
        JSON.stringify({ prioritizedItems: [] }),
      ),
    ).toThrow(SummarizationProviderError);
  });

  it('fills empty executiveSummary and empty prioritizedItems with fallbacks', () => {
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: '   ',
          prioritizedItems: [],
        }),
      ),
    ).toEqual({
      executiveSummary:
        'No executive summary text was returned. Use the observation list in your report for details.',
      prioritizedItems: [
        {
          rank: 1,
          title: 'Review raw observations',
          rationale:
            'The model did not return prioritized findings. Use the supplied section observations for details.',
        },
      ],
    });
  });

  it('fills empty executiveSummary but keeps items when the model returned some', () => {
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: '',
          prioritizedItems: [
            {
              rank: 1,
              title: 'Roof',
              rationale: 'Mentioned in input.',
            },
          ],
        }),
      ),
    ).toEqual({
      executiveSummary:
        'No executive summary text was returned. Use the observation list in your report for details.',
      prioritizedItems: [
        { rank: 1, title: 'Roof', rationale: 'Mentioned in input.' },
      ],
    });
  });

  it('normalizes duplicate or gapped ranks to 1..n (stable order for ties)', () => {
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'x',
          prioritizedItems: [
            { rank: 1, title: 'a', rationale: 'b' },
            { rank: 1, title: 'c', rationale: 'd' },
          ],
        }),
      ),
    ).toEqual({
      executiveSummary: 'x',
      prioritizedItems: [
        { rank: 1, title: 'a', rationale: 'b' },
        { rank: 2, title: 'c', rationale: 'd' },
      ],
    });

    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'x',
          prioritizedItems: [
            { rank: 1, title: 'a', rationale: 'b' },
            { rank: 3, title: 'c', rationale: 'd' },
          ],
        }),
      ),
    ).toEqual({
      executiveSummary: 'x',
      prioritizedItems: [
        { rank: 1, title: 'a', rationale: 'b' },
        { rank: 2, title: 'c', rationale: 'd' },
      ],
    });
  });

  it('normalizes 0-based ranks to 1..n', () => {
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'Summary here.',
          prioritizedItems: [
            { rank: 0, title: 'First', rationale: 'R0.' },
            { rank: 1, title: 'Second', rationale: 'R1.' },
          ],
        }),
      ),
    ).toEqual({
      executiveSummary: 'Summary here.',
      prioritizedItems: [
        { rank: 1, title: 'First', rationale: 'R0.' },
        { rank: 2, title: 'Second', rationale: 'R1.' },
      ],
    });
  });

  it('rejects empty title', () => {
    expect(() =>
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'x',
          prioritizedItems: [{ rank: 1, title: '', rationale: 'ok' }],
        }),
      ),
    ).toThrow(SummarizationProviderError);
  });

  it('accepts empty rationale strings by substituting fallback text', () => {
    expect(
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'x',
          prioritizedItems: [
            { rank: 1, title: 'Life Expectancy', rationale: '' },
            { rank: 2, title: 'Property Value', rationale: '   ' },
          ],
        }),
      ),
    ).toEqual({
      executiveSummary: 'x',
      prioritizedItems: [
        {
          rank: 1,
          title: 'Life Expectancy',
          rationale:
            'No separate rationale was returned for “Life Expectancy”; confirm against the observation text.',
        },
        {
          rank: 2,
          title: 'Property Value',
          rationale:
            'No separate rationale was returned for “Property Value”; confirm against the observation text.',
        },
      ],
    });
  });
});
